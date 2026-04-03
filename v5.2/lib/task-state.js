'use strict';
const { kbRead, kbSave, kbList, parallelKbRead, audit } = require('../core/loop');
const crypto = require('crypto');

const STATES = {
  PENDING: 'pending', QUEUED: 'queued', DISPATCHED: 'dispatched',
  EXECUTING: 'executing', BLOCKED: 'blocked', NEEDS_APPROVAL: 'needs_approval',
  VERIFIED: 'verified', ABORTED: 'aborted', FAILED: 'failed', ARCHIVED: 'archived'
};

const TRANSITIONS = {
  pending: ['queued'],
  queued: ['dispatched'],
  dispatched: ['executing', 'blocked', 'aborted'],
  executing: ['verified', 'blocked', 'needs_approval', 'aborted', 'failed'],
  blocked: ['executing', 'aborted'],
  needs_approval: ['executing', 'aborted'],
  verified: ['archived'],
  aborted: ['archived'],
  failed: ['archived', 'queued']
};

class TaskStateMachine {
  static isValid(from, to) { return (TRANSITIONS[from] || []).includes(to); }
  static allowed(from) { return TRANSITIONS[from] || []; }
}

async function updateTaskState(clientId, taskId, newState, meta = {}) {
  const key = `task:${clientId}:${taskId}`;
  const task = await kbRead(key);
  if (!task) throw new Error(`task_not_found: ${key}`);
  const currentState = task.status || 'pending';
  if (!TaskStateMachine.isValid(currentState, newState)) {
    audit({ type: 'invalid_state_transition', task: taskId, from: currentState, to: newState });
    throw new Error(`invalid_transition: ${currentState} -> ${newState}`);
  }
  task.status = newState;
  task.state_updated_at = new Date().toISOString();
  if (!task.state_history) task.state_history = [];
  task.state_history.push({ from: currentState, to: newState, at: task.state_updated_at, fp: crypto.randomBytes(4).toString('hex'), ...meta });
  await kbSave(key, task);
  audit({ type: 'task_state_change', task: taskId, client: clientId, from: currentState, to: newState });
  return task;
}

async function reconcileStaleTasks(clients) {
  let aborted = 0;
  for (const client of clients) {
    const taskKeys = await kbList(`task:${client.id}:`);
    const tasks = await parallelKbRead(taskKeys.slice(-50));
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (!task || task.status !== 'dispatched') continue;
      const age = (Date.now() - new Date(task.dispatched_at || task.state_updated_at || 0).getTime()) / 3600000;
      if (age > 48) { try { await updateTaskState(client.id, task.id, STATES.ABORTED, { reason: 'stale_timeout_48h', age_hours: Math.round(age) }); aborted++; } catch {} }
    }
  }
  return aborted;
}

module.exports = { STATES, TaskStateMachine, updateTaskState, reconcileStaleTasks };
