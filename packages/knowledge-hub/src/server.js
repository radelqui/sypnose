import express from 'express';
import { getDb, closeDb } from './db.js';
import { kbSave, kbSearch, kbRead, kbList, kbContext, kbPrune } from './tools/index.js';
import { inboxSend, inboxCheck, inboxAck, inboxCount } from './inbox.js';
import { a2aSend, a2aMessages, a2aMarkRead, a2aThread, checkA2aTimeouts } from './a2a.js';
import { channelCreate, channelPublish, channelMessages, channelSubscribe, channelUnsubscribe, channelList } from './channels.js';

const app = express();
const PORT = 18791;

app.use(express.json());

// GET /health
app.get('/health', (req, res) => {
  try {
    const db = getDb();
    const counts = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN tier = 'HOT' THEN 1 ELSE 0 END) as hot,
        SUM(CASE WHEN tier = 'WARM' THEN 1 ELSE 0 END) as warm,
        SUM(CASE WHEN tier = 'COLD' THEN 1 ELSE 0 END) as cold
      FROM knowledge
    `).get();
    const inboxCount = db.prepare('SELECT COUNT(*) as cnt FROM inbox WHERE read_at IS NULL').get();
    const a2aTotal = db.prepare('SELECT COUNT(*) as cnt FROM a2a_messages').get();
    const a2aUnread = db.prepare('SELECT COUNT(*) as cnt FROM a2a_messages WHERE read_at IS NULL').get();
    const channelsCount = db.prepare('SELECT COUNT(*) as cnt FROM channels').get();
    const channelMsgsToday = db.prepare("SELECT COUNT(*) as cnt FROM channel_messages WHERE date(created_at) = date('now')").get();
    const timeoutsTriggered = db.prepare("SELECT COUNT(*) as cnt FROM inbox WHERE message LIKE '%A2A TIMEOUT%'").get();
    res.json({
      status: 'ok', service: 'knowledge-hub', version: '1.1.0',
      uptime: process.uptime(),
      counts: { total: counts.total, hot: counts.hot || 0, warm: counts.warm || 0, cold: counts.cold || 0 },
      inbox: { unread: inboxCount.cnt },
      a2a: { total: a2aTotal.cnt, unread: a2aUnread.cnt, timeouts_triggered: timeoutsTriggered.cnt },
      channels: { count: channelsCount.cnt, messages_today: channelMsgsToday.cnt }
    });
  } catch (err) { res.status(500).json({ status: 'error', error: err.message }); }
});

// GET /api/context?project=X&category=Y&limit=N
app.get('/api/context', (req, res) => {
  try {
    const { project, category, limit } = req.query;
    res.json(kbContext({ project: project || null, category: category || null, limit: limit ? parseInt(limit) : 20 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/search?q=QUERY&project=X&category=Y&limit=N
app.get('/api/search', (req, res) => {
  try {
    const { q, project, category, limit } = req.query;
    if (!q) return res.status(400).json({ error: 'query parameter q is required' });
    res.json(kbSearch({ query: q, project: project || null, category: category || null, limit: limit ? parseInt(limit) : 10 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/save
app.post('/api/save', (req, res) => {
  try { res.json(kbSave(req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/read?key=X&project=Y
app.get('/api/read', (req, res) => {
  try {
    const { key, project } = req.query;
    if (!key) return res.status(400).json({ error: 'key is required' });
    res.json(kbRead({ key, project: project || null }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/list?project=X&category=Y&tier=Z&limit=N&offset=N
app.get('/api/list', (req, res) => {
  try {
    const { project, category, tier, limit, offset } = req.query;
    res.json(kbList({ project: project || null, category: category || null, tier: tier || null,
      limit: limit ? parseInt(limit) : 50, offset: offset ? parseInt(offset) : 0 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
  try {
    const db = getDb();
    const tierCounts = db.prepare('SELECT tier, COUNT(*) as count FROM knowledge GROUP BY tier').all();
    const categoryCounts = db.prepare('SELECT category, COUNT(*) as count FROM knowledge GROUP BY category ORDER BY count DESC LIMIT 20').all();
    const projectCounts = db.prepare("SELECT COALESCE(project, '(global)') as project, COUNT(*) as count FROM knowledge GROUP BY project ORDER BY count DESC").all();
    const topAccessed = db.prepare('SELECT key, project, access_count, tier FROM knowledge ORDER BY access_count DESC LIMIT 10').all();
    res.json({ tiers: Object.fromEntries(tierCounts.map(r => [r.tier, r.count])), categories: categoryCounts, projects: projectCounts, topAccessed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/prune
app.post('/api/prune', (req, res) => {
  try {
    const { dryRun } = req.body || {};
    res.json(kbPrune({ dryRun: dryRun || false }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── INBOX endpoints ──────────────────────────────────────────────────────────

// POST /api/inbox/send — {to, from, message, priority}
app.post('/api/inbox/send', (req, res) => {
  try {
    const { to, from, message, priority } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
    res.json(inboxSend({ to, from: from || 'system', message, priority: priority || 'media' }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/inbox/check?for=X&limit=N
app.get('/api/inbox/check', (req, res) => {
  try {
    const { for: recipient, limit } = req.query;
    if (!recipient) return res.status(400).json({ error: 'for parameter is required' });
    res.json(inboxCheck({ for: recipient, limit: limit ? parseInt(limit) : 20 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/inbox/ack — {id}
app.post('/api/inbox/ack', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    res.json(inboxAck({ id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/inbox/count?for=X
app.get('/api/inbox/count', (req, res) => {
  try {
    const { for: recipient } = req.query;
    if (!recipient) return res.status(400).json({ error: 'for parameter is required' });
    res.json(inboxCount({ for: recipient }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── A2A endpoints ──────────────────────────────────────────────────────────

// POST /a2a/send — {from, to, type, payload, reply_to}
app.post('/a2a/send', (req, res) => {
  try {
    const { from, to, type, payload, reply_to } = req.body;
    if (!from || !to || !payload) return res.status(400).json({ error: 'from, to, and payload are required' });
    res.json(a2aSend({ from, to, type, payload, reply_to }));
  } catch (err) { res.status(err.message.includes('cannot create tasks') ? 403 : 500).json({ error: err.message }); }
});

// GET /a2a/messages?agent=X&unread=true&type=Y&from=Z&limit=N
app.get('/a2a/messages', (req, res) => {
  try {
    const { agent, unread, type, from, limit } = req.query;
    if (!agent) return res.status(400).json({ error: 'agent parameter is required' });
    res.json(a2aMessages({ agent, unread: unread === 'true', type: type || null, from: from || null, limit: limit ? parseInt(limit) : 20 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /a2a/read — {id}
app.post('/a2a/read', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    res.json(a2aMarkRead({ id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /a2a/thread?id=N
app.get('/a2a/thread', (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id parameter is required' });
    res.json(a2aThread({ id: parseInt(id) }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /a2a/check-timeouts — manual trigger for debugging
app.get('/a2a/check-timeouts', (req, res) => {
  try { res.json(checkA2aTimeouts()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Channel endpoints ──────────────────────────────────────────────────────

app.post('/channels/create', (req, res) => {
  try { res.json(channelCreate(req.body)); }
  catch (err) { res.status(err.message.includes('already exists') ? 409 : 500).json({ error: err.message }); }
});

app.post('/channels/publish', (req, res) => {
  try { res.json(channelPublish(req.body)); }
  catch (err) { res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message }); }
});

app.get('/channels/list', (req, res) => {
  try { res.json(channelList({ project: req.query.project || null })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/channels/:name/messages', (req, res) => {
  try {
    const { since, limit } = req.query;
    res.json(channelMessages({ name: req.params.name, since: since || null, limit: limit ? parseInt(limit) : 50 }));
  } catch (err) { res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message }); }
});

app.post('/channels/:name/subscribe', (req, res) => {
  try {
    const { agent } = req.body;
    if (!agent) return res.status(400).json({ error: 'agent is required' });
    res.json(channelSubscribe({ name: req.params.name, agent }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/channels/:name/unsubscribe', (req, res) => {
  try {
    const { agent } = req.body;
    if (!agent) return res.status(400).json({ error: 'agent is required' });
    res.json(channelUnsubscribe({ name: req.params.name, agent }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Graceful shutdown
process.on('SIGTERM', () => { closeDb(); process.exit(0); });
process.on('SIGINT', () => { closeDb(); process.exit(0); });

// A2A timeout checker — every 60 seconds
setInterval(() => {
  try { checkA2aTimeouts(); }
  catch(e) { console.error('[a2a-timeout]', e.message); }
}, 60000);

app.listen(PORT, '127.0.0.1', () => {
  getDb(); // init DB + create inbox table
  console.log('KnowledgeHub HTTP server v1.1.0 listening on 127.0.0.1:' + PORT);
});
