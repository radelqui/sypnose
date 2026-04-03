'use strict';
const { kbRead, kbSave, audit } = require('../core/loop');
const TIMEOUT = 120000;

async function checkHeartbeats(clients) {
  const s = {};
  for (const c of clients) {
    const hb = await kbRead(`heartbeat:${c.id}`);
    if (!hb) { s[c.id] = { alive: false }; continue; }
    const age = Date.now() - new Date(hb.ts).getTime();
    s[c.id] = { alive: age < TIMEOUT, last: hb.ts, age_s: Math.round(age / 1000) };
    if (age >= TIMEOUT) audit({ type: 'heartbeat_timeout', agent: c.id });
  }
  return s;
}

async function sendHeartbeat(id, meta = {}) { await kbSave(`heartbeat:${id}`, { agent: id, ts: new Date().toISOString(), ...meta }); }

module.exports = { checkHeartbeats, sendHeartbeat };
