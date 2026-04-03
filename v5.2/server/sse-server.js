'use strict';
const http = require('http');
const fs = require('fs');
const PORT = parseInt(process.env.SSE_PORT || '18795');
const EF = '/var/log/sypnose/events/stream.jsonl';
const clients = new Set();
let offset = 0;

function readNew() {
  try {
    if (!fs.existsSync(EF)) return [];
    const st = fs.statSync(EF);
    if (st.size <= offset) return [];
    const fd = fs.openSync(EF, 'r');
    const buf = Buffer.alloc(st.size - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);
    offset = st.size;
    return buf.toString('utf-8').trim().split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

setInterval(() => {
  const ev = readNew();
  if (!clients.size || !ev.length) return;
  const p = ev.map(e => `data: ${JSON.stringify(e)}\n\n`).join('');
  for (const r of clients) { try { r.write(p); } catch { clients.delete(r); } }
}, 2000);

const srv = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.SSE_CORS || '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/sse') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    try {
      if (fs.existsSync(EF)) {
        const lines = fs.readFileSync(EF, 'utf-8').trim().split('\n').slice(-50);
        const hist = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        if (hist.length) res.write(`data: ${JSON.stringify({ type: 'history', events: hist })}\n\n`);
      }
    } catch {}
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', clients: clients.size }));
    return;
  }

  if (url.pathname === '/events') {
    const n = parseInt(url.searchParams.get('n') || '100');
    try {
      const lines = fs.existsSync(EF) ? fs.readFileSync(EF, 'utf-8').trim().split('\n').slice(-n) : [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ events: lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) }));
    } catch (e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // Webhook endpoint
  if (req.method === 'POST' && url.pathname.startsWith('/webhook/')) {
    const token = req.headers['x-webhook-token'] || url.searchParams.get('token');
    if (token !== process.env.WEBHOOK_TOKEN) { res.writeHead(401); res.end(); return; }
    const source = url.pathname.split('/')[2];
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const { kbSave } = require('../core/loop');
        const event = req.headers['x-github-event'] || 'unknown';
        const k = `mailbox:coordinator:${Date.now()}-wh`;
        await kbSave(k, { id: k, from: 'webhook', to: 'coordinator', type: 'webhook_event', payload: { source, event, payload: JSON.parse(body) }, created_at: new Date().toISOString(), claimed_by: null, ack: false, version: 0, priority: 'normal' });
        res.writeHead(200); res.end('{"ok":true}');
      } catch (e) { res.writeHead(400); res.end(`{"error":"${e.message}"}`); }
    });
    return;
  }

  // Remote flag toggle
  if (req.method === 'POST' && url.pathname.startsWith('/flags/')) {
    if (url.searchParams.get('token') !== process.env.WEBHOOK_TOKEN) { res.writeHead(401); res.end(); return; }
    const parts = url.pathname.split('/');
    const cid = parts[2], flag = parts[3];
    const val = url.searchParams.get('value') === 'true';
    const { kbSave, kbRead } = require('../core/loop');
    const flags = await kbRead(`flags:${cid}`) || {};
    flags[flag] = { enabled: val };
    await kbSave(`flags:${cid}`, flags);
    res.writeHead(200); res.end(JSON.stringify({ ok: true, flag, value: val }));
    return;
  }

  res.writeHead(404); res.end();
});

srv.listen(PORT, '127.0.0.1', () => console.log(`[SSE] :${PORT}`));
process.on('SIGTERM', () => { for (const r of clients) { try { r.end(); } catch {} } srv.close(() => process.exit(0)); });
