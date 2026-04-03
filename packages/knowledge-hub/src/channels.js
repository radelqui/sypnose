/**
 * channels.js — MsgHub broadcast pub/sub channels
 * Agents subscribe to channels and receive broadcast messages.
 */
import { getDb } from './db.js';
import http from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';

// Resolve sypnose-hub token once at module load
let hubToken = process.env.SYPNOSE_HUB_TOKEN || '';
if (!hubToken) {
  try {
    hubToken = readFileSync(join(process.env.HOME || '/home/gestoria', '.config', 'sypnose-hub-token'), 'utf-8').trim();
  } catch(e) {
    hubToken = 'CAMBIAR_TOKEN'; // fallback
  }
}

export function channelCreate({ name, project = null, subscribers = [] }) {
  if (!name) throw new Error('name is required');
  const db = getDb();

  const existing = db.prepare('SELECT id FROM channels WHERE name = ?').get(name);
  if (existing) throw new Error(`Channel '${name}' already exists`);

  const result = db.prepare('INSERT INTO channels (name, project) VALUES (?, ?)').run(name, project);
  const channelId = result.lastInsertRowid;

  const insertSub = db.prepare('INSERT OR IGNORE INTO channel_subscribers (channel_id, agent) VALUES (?, ?)');
  for (const agent of subscribers) {
    insertSub.run(channelId, agent);
  }

  return { success: true, id: channelId, name, subscribers: subscribers.length };
}

export function channelPublish({ channel, from, message }) {
  if (!channel || !from || !message) throw new Error('channel, from, and message are required');
  const db = getDb();

  const ch = db.prepare('SELECT id, project FROM channels WHERE name = ?').get(channel);
  if (!ch) throw new Error(`Channel '${channel}' not found`);

  const result = db.prepare('INSERT INTO channel_messages (channel_id, from_agent, message) VALUES (?, ?, ?)').run(ch.id, from, message);

  const subs = db.prepare('SELECT agent FROM channel_subscribers WHERE channel_id = ?').all(ch.id);

  // SSE push via sypnose-hub (fire-and-forget, non-blocking)
  try {
    const ssePayload = JSON.stringify({
      agent: from,
      priority: 'normal',
      title: `channel:${channel}`,
      message: message.substring(0, 200),
      project: ch.project || 'sistema',
    });

    const sseReq = http.request({
      hostname: '127.0.0.1',
      port: 8095,
      path: '/publish',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + hubToken,
      },
      timeout: 2000,
    }, (sseRes) => {
      // consume response to free socket
      sseRes.resume();
    });
    sseReq.on('error', (e) => {
      console.warn('[channels] SSE push failed (hub may be down):', e.message);
    });
    sseReq.write(ssePayload);
    sseReq.end();
  } catch(e) {
    console.warn('[channels] SSE push error:', e.message);
  }

  return { success: true, id: result.lastInsertRowid, channel, from, subscribers: subs.map(s => s.agent) };
}

export function channelMessages({ name, since = null, limit = 50 }) {
  if (!name) throw new Error('channel name is required');
  const db = getDb();

  const ch = db.prepare('SELECT id FROM channels WHERE name = ?').get(name);
  if (!ch) throw new Error(`Channel '${name}' not found`);

  let sql = 'SELECT cm.*, cs.name as channel_name FROM channel_messages cm LEFT JOIN channels cs ON cs.id = cm.channel_id WHERE cm.channel_id = ?';
  const params = [ch.id];

  if (since) {
    // Normalize ISO 8601 T separator to space for SQLite compatibility
    sql += ' AND cm.created_at >= ?';
    params.push(since.replace('T', ' '));
  }

  sql += ' ORDER BY cm.created_at DESC LIMIT ?';
  params.push(limit);

  const messages = db.prepare(sql).all(...params);
  return { channel: name, count: messages.length, messages };
}

export function channelSubscribe({ name, agent }) {
  if (!name || !agent) throw new Error('name and agent are required');
  const db = getDb();

  const ch = db.prepare('SELECT id FROM channels WHERE name = ?').get(name);
  if (!ch) throw new Error(`Channel '${name}' not found`);

  db.prepare('INSERT OR IGNORE INTO channel_subscribers (channel_id, agent) VALUES (?, ?)').run(ch.id, agent);
  return { success: true, channel: name, agent, action: 'subscribed' };
}

export function channelUnsubscribe({ name, agent }) {
  if (!name || !agent) throw new Error('name and agent are required');
  const db = getDb();

  const ch = db.prepare('SELECT id FROM channels WHERE name = ?').get(name);
  if (!ch) throw new Error(`Channel '${name}' not found`);

  const result = db.prepare('DELETE FROM channel_subscribers WHERE channel_id = ? AND agent = ?').run(ch.id, agent);
  return { success: result.changes > 0, channel: name, agent, action: 'unsubscribed' };
}

export function channelList({ project = null }) {
  const db = getDb();
  let sql = 'SELECT c.*, (SELECT COUNT(*) FROM channel_subscribers WHERE channel_id = c.id) as subscriber_count, (SELECT COUNT(*) FROM channel_messages WHERE channel_id = c.id) as message_count FROM channels c';
  const params = [];
  if (project) {
    sql += ' WHERE c.project = ?';
    params.push(project);
  }
  sql += ' ORDER BY c.name';
  return { channels: db.prepare(sql).all(...params) };
}
