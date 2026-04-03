/**
 * inbox.js — Inbox system for KB server
 * Handles agent-to-agent messages + Telegram webhook on notifications
 */
import { getDb } from './db.js';

const TELEGRAM_BOT_TOKEN = '8618224192:AAGWzYwJipBXqBP0C9cuHp4BWOWzC2rxwu8';
const TELEGRAM_CHAT_ID = '5358902915';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// Map agent IDs to human-readable names for Telegram messages
const AGENT_NAMES = {
  'sm-claude-web': '🌐 SM',
  'seguridad': '🔒 Seguridad',
  'iatrader': '📈 IATrader',
  'iatrader-rust': '🦀 IATrader-Rust',
  'gestoriard': '📊 GestoriaRD',
  'facturaia': '🧾 FacturaIA',
  'dgii': '🏛️ DGII',
  'oc-manual': '📖 OC-Manual',
  'system': '⚙️ Sistema',
};

/**
 * Send a Telegram message (fire-and-forget, non-blocking)
 */
function sendTelegram(text) {
  const body = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'HTML',
  });

  fetch(TELEGRAM_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(8000),
  }).catch(err => {
    console.error('[inbox] Telegram webhook failed:', err.message);
  });
}

/**
 * Detect if notification value contains DONE or ERROR, extract task name
 */
function parseNotificationValue(value) {
  const doneMatch = value.match(/^DONE:\s*([^\n|]+)/m);
  const errorMatch = value.match(/^ERROR:\s*([^\n|]+)/m);
  const toMatch = value.match(/TO:\s*(\S+)/);
  const fromMatch = value.match(/FROM:\s*(\S+)/);
  const commitMatch = value.match(/COMMIT:\s*([a-f0-9]{7,})/);
  const summaryMatch = value.match(/RESUMEN:\s*(.+?)(?:\n|$)/);

  return {
    isDone: !!doneMatch,
    isError: !!errorMatch,
    taskName: (doneMatch || errorMatch)?.[1]?.trim() || 'unknown',
    to: toMatch?.[1] || null,
    from: fromMatch?.[1] || null,
    commit: commitMatch?.[1] || null,
    summary: summaryMatch?.[1]?.trim() || null,
  };
}

/**
 * Hook called by kb_save when category=notification
 * Inserts into inbox + fires Telegram webhook
 */
export function handleNotification({ key, value, project, sender = 'system' }) {
  const db = getDb();
  const parsed = parseNotificationValue(value);

  const recipient = parsed.to || 'sm-claude-web';
  const priority = parsed.isError ? 'alta' : 'media';

  // 1. Insert into inbox
  try {
    db.prepare(`
      INSERT INTO inbox (recipient, sender, message, priority)
      VALUES (?, ?, ?, ?)
    `).run(recipient, parsed.from || sender, value, priority);
  } catch (err) {
    console.error('[inbox] Failed to insert into inbox:', err.message);
  }

  // 2. Fire Telegram webhook (async, non-blocking)
  const emoji = parsed.isError ? '🚨' : '✅';
  const statusWord = parsed.isError ? 'ERROR' : 'DONE';
  const agentFrom = AGENT_NAMES[parsed.from] || parsed.from || 'desconocido';
  const agentTo = AGENT_NAMES[recipient] || recipient;
  const commitStr = parsed.commit ? ` · <code>${parsed.commit}</code>` : '';
  const summaryStr = parsed.summary ? `\n📝 ${parsed.summary}` : '';
  const projectStr = project ? ` [${project}]` : '';

  const telegramMsg = `${emoji} <b>${statusWord}: ${parsed.taskName}</b>${projectStr}
👤 ${agentFrom} → ${agentTo}${commitStr}${summaryStr}`;

  sendTelegram(telegramMsg);
}

// ─── Inbox CRUD functions ───────────────────────────────────────────────────

export function inboxSend({ to, from = 'system', message, priority = 'media' }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO inbox (recipient, sender, message, priority)
    VALUES (?, ?, ?, ?)
  `).run(to, from, message, priority);
  return { success: true, id: result.lastInsertRowid, to, from, priority };
}

export function inboxCheck({ for: recipient, limit = 20 }) {
  if (!recipient) throw new Error('recipient (for) is required');
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, recipient, sender, message, priority, created_at
    FROM inbox
    WHERE recipient = ? AND read_at IS NULL
    ORDER BY
      CASE priority WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
      created_at DESC
    LIMIT ?
  `).all(recipient, limit);
  return { recipient, unread: rows.length, messages: rows };
}

export function inboxAck({ id }) {
  if (!id) throw new Error('id is required');
  const db = getDb();
  const result = db.prepare(`
    UPDATE inbox SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL
  `).run(id);
  return { success: result.changes > 0, id, acknowledged: result.changes > 0 };
}

export function inboxCount({ for: recipient }) {
  if (!recipient) throw new Error('recipient (for) is required');
  const db = getDb();
  const row = db.prepare(`
    SELECT COUNT(*) as unread FROM inbox WHERE recipient = ? AND read_at IS NULL
  `).get(recipient);
  return { recipient, unread: row.unread };
}
