const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8095;
const TOKEN = process.env.SYPNOSE_HUB_TOKEN || 'sypnose-hub-secret-2026';
const KB_URL = 'http://localhost:18791/api/search?q=notify+sm&limit=20';
const POLL_INTERVAL = 5000;
const MAX_BUFFER = 100;

// ── logging ───────────────────────────────────────────────────────────────────

const LOG_DIR = process.env.LOG_DIR || path.join(process.env.HOME || '/home/gestoria', '.openclaw');
const LOG_FILE = path.join(LOG_DIR, 'sypnose-hub.log');
const MAX_LOG_SIZE = 1024 * 1024; // 1MB
const MAX_LOG_FILES = 3;

function rotateLog() {
  try {
    const stats = fs.statSync(LOG_FILE);
    if (stats.size >= MAX_LOG_SIZE) {
      // Rotar: .log.2 → borrar, .log.1 → .log.2, .log → .log.1
      for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
        const src = i === 1 ? LOG_FILE : `${LOG_FILE}.${i - 1}`;
        const dst = `${LOG_FILE}.${i}`;
        try { fs.renameSync(src, dst); } catch (e) {}
      }
    }
  } catch (e) {} // archivo no existe aún
}

function log(level, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}\n`;
  process.stdout.write(line); // journald
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    rotateLog();
    fs.appendFileSync(LOG_FILE, line);
  } catch (e) {}
}

// State
const clients = new Map(); // key=res, value={projectFilter, keepAlive}
const eventBuffer = []; // circular buffer, max 100
let lastSeenId = 0;
let lastCheckTime = null;
let eventCounter = 0;

// ── helpers ──────────────────────────────────────────────────────────────────

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

function validateAuth(req) {
  const auth = req.headers['authorization'] || '';
  return auth === `Bearer ${TOKEN}`;
}

function addToBuffer(event) {
  eventBuffer.push(event);
  if (eventBuffer.length > MAX_BUFFER) {
    eventBuffer.shift();
  }
}

function broadcastSSE(event) {
  const payload = `event: notification\ndata: ${JSON.stringify(event)}\n\n`;
  for (const [client, opts] of clients) {
    try {
      // Si el cliente tiene filtro de proyecto, skip si no coincide
      if (opts.projectFilter && event.project !== opts.projectFilter) continue;
      client.write(payload);
    } catch (e) {
      clients.delete(client);
    }
  }
}

// ── KB polling ────────────────────────────────────────────────────────────────

function parseKBUrl(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('KB response parse error: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(4000, () => {
      req.destroy();
      reject(new Error('KB request timeout'));
    });
    req.end();
  });
}

async function pollKB() {
  lastCheckTime = new Date().toISOString();
  try {
    const result = await parseKBUrl(KB_URL);
    // result may be array or {results:[...]} or {entries:[...]}
    const entries = Array.isArray(result)
      ? result
      : (result.results || result.entries || result.items || []);

    for (const entry of entries) {
      const id = entry.id || entry.rowid || 0;
      const key = entry.key || '';
      const value = entry.value || '';

      if (id <= lastSeenId) continue;

      // Only process relevant notifications
      const isNotify = key.startsWith('notify-sm') || key.startsWith('reply-sm') || value.includes('TO: sm');
      if (!isNotify) {
        if (id > lastSeenId) lastSeenId = id;
        continue;
      }

      if (id > lastSeenId) lastSeenId = id;

      eventCounter++;
      const event = {
        id: eventCounter,
        kb_id: id,
        agent: entry.project || entry.agent || 'unknown',
        priority: 'normal',
        title: key,
        message: value,
        timestamp: entry.created_at || new Date().toISOString(),
        project: entry.project || ''
      };

      addToBuffer(event);
      broadcastSSE(event);
      log('INFO', `New KB entries detected: ${eventCounter} — id=${id} key=${key}`);
      log('INFO', `SSE event emitted: ${eventCounter}`);
    }
  } catch (err) {
    log('ERROR', `KB poll failed: ${err.message}`);
  }
}

// ── request handler ──────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  const path = url.split('?')[0];

  // CORS preflight
  if (method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  setCorsHeaders(res);

  // GET /health
  if (method === 'GET' && path === '/health') {
    const activeFilters = [...clients.values()]
      .map(o => o.projectFilter)
      .filter(Boolean);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      clients: clients.size,
      activeFilters,
      lastCheck: lastCheckTime,
      lastSeenId,
      bufferedEvents: eventBuffer.length,
      uptime: process.uptime()
    }));
    return;
  }

  // GET /stream  — SSE
  if (method === 'GET' && path === '/stream') {
    if (!validateAuth(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized', message: 'Missing or invalid Bearer token' }));
      return;
    }

    const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const lastId = parseInt(params.get('last_id') || '0', 10);
    const projectFilter = params.get('project') || null;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Send missed events from buffer (applying project filter)
    const missed = eventBuffer.filter(e => {
      if (e.id <= lastId) return false;
      if (projectFilter && e.project !== projectFilter) return false;
      return true;
    });
    for (const event of missed) {
      res.write(`event: notification\ndata: ${JSON.stringify(event)}\n\n`);
    }

    // Keep-alive comment every 15s
    const keepAlive = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch (e) {
        clearInterval(keepAlive);
      }
    }, 15000);

    clients.set(res, { projectFilter, keepAlive });
    log('INFO', `Client connected (filter=${projectFilter || 'none'}), total: ${clients.size}`);

    req.on('close', () => {
      const opts = clients.get(res);
      if (opts) clearInterval(opts.keepAlive);
      clients.delete(res);
      log('INFO', `Client disconnected, total: ${clients.size}`);
    });

    req.on('error', () => {
      const opts = clients.get(res);
      if (opts) clearInterval(opts.keepAlive);
      clients.delete(res);
    });

    return;
  }

  // POST /publish
  if (method === 'POST' && path === '/publish') {
    if (!validateAuth(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized', message: 'Missing or invalid Bearer token' }));
      return;
    }

    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Request', message: e.message }));
      return;
    }

    const { agent = 'unknown', priority = 'normal', title = '', message = '', project = '' } = body;

    eventCounter++;
    const event = {
      id: eventCounter,
      agent,
      priority,
      title,
      message,
      timestamp: new Date().toISOString(),
      project
    };

    addToBuffer(event);
    broadcastSSE(event);
    log('INFO', `Publish received from agent: ${agent} title=${title}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, id: eventCounter, clients: clients.size }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// ── graceful shutdown ─────────────────────────────────────────────────────────

function shutdown(signal) {
  log('INFO', `Received ${signal}, closing ${clients.size} clients...`);
  for (const [client, opts] of clients) {
    try { clearInterval(opts.keepAlive); client.end(); } catch (e) { /* ignore */ }
  }
  server.close(() => {
    log('INFO', 'Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── start ─────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  log('INFO', `Server started on port ${PORT}`);
  log('INFO', `KB polling every ${POLL_INTERVAL / 1000}s → ${KB_URL}`);
  // Start polling
  setInterval(pollKB, POLL_INTERVAL);
  // Initial poll after 1s
  setTimeout(pollKB, 1000);
});
