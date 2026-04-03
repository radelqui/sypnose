'use strict';
const { audit, RISK, kbSave, kbRead, callModel, Mailbox } = require('../core/loop');

class ToolRegistry {
  constructor() { this.tools = new Map(); }
  register(t) { this.tools.set(t.name, { ...t, calls: 0, errors: 0, enabled: t.enabled !== false }); }
  forClient(ind) { return [...this.tools.values()].filter(t => t.enabled && (t.industries?.includes('*') || t.industries?.includes(ind))); }
  async execute(n, args, ctx) { const t = this.tools.get(n); if (!t) throw new Error(`Unknown:${n}`); t.calls++; try { const r = await t.execute(args, ctx); audit({ type: 'tool_exec', tool: n }); return r; } catch (e) { t.errors++; throw e; } }
  stats() { const s = {}; for (const [n, t] of this.tools) s[n] = { calls: t.calls, errors: t.errors }; return s; }
}

const registry = new ToolRegistry();
registry.register({ name: 'kb_read', risk: RISK.SAFE, industries: ['*'], execute: async a => kbRead(a.key) });
registry.register({ name: 'kb_write', risk: RISK.NORMAL, industries: ['*'], execute: async a => kbSave(a.key, a.data) });
registry.register({ name: 'fiscal_query', risk: RISK.SAFE, industries: ['accounting'], execute: async a => kbRead(`fiscal:${a.nif}:status`) });
registry.register({ name: 'material_price', risk: RISK.SAFE, industries: ['construction', 'architecture'], execute: async a => (await callModel('web_research', [{ role: 'user', content: `Precio ${a.material} España` }], 500)).content });
registry.register({ name: 'todo_write', risk: RISK.SAFE, industries: ['*'], execute: async a => { const todo = { id: `todo-${Date.now()}`, parent: a.parent_task, desc: a.description, status: 'pending', ts: new Date().toISOString() }; await kbSave(`todo:${a.client_id}:${todo.id}`, todo); return todo; } });
registry.register({ name: 'task_output', risk: RISK.SAFE, industries: ['*'], execute: async a => { await kbSave(`recording:${a.client_id}:${Date.now()}`, { type: 'partial', task_id: a.task_id, output: a.output, progress: a.progress || 0, ts: new Date().toISOString() }); return { recorded: true }; } });
registry.register({ name: 'task_stop', risk: RISK.SAFE, industries: ['*'], execute: async a => { const mb = new Mailbox(a.agent_id); await mb.send('coordinator', { type: 'task_stopped', payload: { task_id: a.task_id, client_id: a.client_id, reason: a.reason, details: a.details }, priority: a.reason === 'error' ? 'critical' : 'normal' }); return { stopped: true }; } });

module.exports = { ToolRegistry, registry };
