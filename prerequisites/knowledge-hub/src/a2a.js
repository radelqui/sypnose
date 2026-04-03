/**
 * a2a.js — Agent-to-Agent direct messaging
 * Agents can send messages directly to each other without going through SM.
 * SM exclusivity: only SM can create tasks. A2A rejects task creation attempts.
 */
import { getDb } from './db.js';
import { inboxSend } from './inbox.js';

/**
 * Send a direct message from one agent to another
 */
export function a2aSend({ from, to, type = 'notify', payload, reply_to = null }) {
  if (!from || !to || !payload) throw new Error('from, to, and payload are required');
  if (!['request', 'response', 'notify'].includes(type)) throw new Error('type must be request, response, or notify');

  // Security: block task creation attempts (SM exclusive)
  if (typeof payload === 'string' && /STATUS:\s*pending/i.test(payload) && /^task-/i.test(payload)) {
    throw new Error('A2A cannot create tasks. Only SM can create tasks via kb_save.');
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO a2a_messages (from_agent, to_agent, type, payload, reply_to)
    VALUES (?, ?, ?, ?, ?)
  `).run(from, to, type, typeof payload === 'object' ? JSON.stringify(payload) : payload, reply_to);

  return { success: true, id: result.lastInsertRowid, from, to, type };
}

/**
 * Get messages for an agent
 */
export function a2aMessages({ agent, unread = false, type = null, from = null, limit = 20 }) {
  if (!agent) throw new Error('agent is required');

  const db = getDb();
  let sql = 'SELECT * FROM a2a_messages WHERE to_agent = ?';
  const params = [agent];

  if (unread) {
    sql += ' AND read_at IS NULL';
  }
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (from) {
    sql += ' AND from_agent = ?';
    params.push(from);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const messages = db.prepare(sql).all(...params);
  return { agent, count: messages.length, messages };
}

/**
 * Mark a message as read
 */
export function a2aMarkRead({ id }) {
  if (!id) throw new Error('id is required');
  const db = getDb();
  const result = db.prepare(`
    UPDATE a2a_messages SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL
  `).run(id);
  return { success: result.changes > 0, id };
}

/**
 * Get conversation thread by reply_to chain
 */
export function a2aThread({ id }) {
  if (!id) throw new Error('id is required');
  const db = getDb();

  // Get the root message and all replies
  const messages = db.prepare(`
    SELECT * FROM a2a_messages
    WHERE id = ? OR reply_to = ?
    ORDER BY created_at ASC
  `).all(id, id);

  return { thread_id: id, count: messages.length, messages };
}

/**
 * Check for A2A requests without response after 5 minutes.
 * Sends inbox notification to SM for each timed-out request.
 */
export function checkA2aTimeouts() {
  const db = getDb();

  // Find requests older than 5 min, no reply, not yet notified
  const timedOut = db.prepare(`
    SELECT m.id, m.from_agent, m.to_agent, m.payload, m.created_at
    FROM a2a_messages m
    WHERE m.type = 'request'
      AND m.notified = 0
      AND m.created_at < datetime('now', '-5 minutes')
      AND NOT EXISTS (
        SELECT 1 FROM a2a_messages r
        WHERE r.reply_to = m.id AND r.type = 'response'
      )
  `).all();

  for (const req of timedOut) {
    const minutesAgo = Math.round((Date.now() - new Date(req.created_at + 'Z').getTime()) / 60000);
    const preview = (req.payload || '').substring(0, 80);

    // Send inbox alert to SM
    try {
      inboxSend({
        to: 'sm-claude-web',
        from: 'system',
        message: `A2A TIMEOUT: ${req.from_agent} pidió a ${req.to_agent} hace ${minutesAgo}min sin respuesta. ID: ${req.id}. Payload: ${preview}`,
        priority: 'alta',
      });
    } catch(e) {
      console.error('[a2a] Failed to send timeout notification:', e.message);
    }

    // Mark as notified
    db.prepare('UPDATE a2a_messages SET notified = 1 WHERE id = ?').run(req.id);
  }

  if (timedOut.length > 0) {
    console.log(`[a2a] ${timedOut.length} request(s) timed out, SM notified`);
  }

  return { checked: true, timedOut: timedOut.length };
}
