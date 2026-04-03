'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodeFetch = require('node-fetch');

const KB_API = process.env.KB_API || 'http://localhost:18791/api';
const PROXY = process.env.PROXY_URL || 'http://localhost:8317/v1/chat/completions';
const ANTHROPIC_DIRECT = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const AUDIT_DIR = '/var/log/sypnose/audit';
const EVENTS_DIR = '/var/log/sypnose/events';
const VERSION = '5.2.0';
const INTERVAL = 30_000;
const MAX_ERRORS = 5;
const TICK_BUDGET = 15_000;
const MAX_SESSION_HOURS = 8;
const BRIEF = process.env.BRIEF === '1';
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || crypto.randomBytes(16).toString('hex');
const TRACE_SALT = process.env.TRACE_SALT || crypto.randomBytes(6).toString('hex');

// ═══════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function retryFetch(url, opts, retries = 3, delays = [500, 1000, 2000]) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await nodeFetch(url, { ...opts, signal: AbortSignal.timeout(opts.timeout || 10000) });
      if (r.ok || r.status < 500) return r;
    } catch (e) { if (i === retries - 1) throw e; }
    await sleep(delays[Math.min(i, delays.length - 1)]);
  }
}

async function parallelKbRead(keys, concurrency = 5) {
  const results = new Array(keys.length);
  for (let i = 0; i < keys.length; i += concurrency) {
    const batch = keys.slice(i, i + concurrency);
    const br = await Promise.all(batch.map(k => kbRead(k).catch(() => null)));
    br.forEach((r, j) => { results[i + j] = (r && !r.__deleted) ? r : null; });
  }
  return results;
}

function atomicAppend(f, content) {
  const tmp = `${f}.${process.pid}.tmp`;
  try {
    if (fs.existsSync(f)) fs.copyFileSync(f, tmp);
    fs.appendFileSync(tmp, content);
    fs.renameSync(tmp, f);
  } catch {
    try { fs.unlinkSync(tmp); } catch {}
    fs.appendFileSync(f, content);
  }
}

function escapeTmux(msg) {
  return msg.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$')
    .replace(/`/g, '\\`').replace(/;/g, '\\;').replace(/\|/g, '\\|')
    .replace(/&/g, '\\&').replace(/\n/g, ' ');
}

function classifyTimeout(cmd) {
  const c = (cmd || '').toLowerCase();
  if (/^(ls|cat|grep|head|tail|wc|git\s+(status|log|diff)|echo|pwd|date|whoami)/.test(c)) return 5000;
  if (/^(npm\s+test|curl|python|node\s+-e|lint|jest|pytest|make\s+test)/.test(c)) return 30000;
  if (/^(npm\s+install|docker|pip\s+install|cargo\s+build|migration|deploy)/.test(c)) return 300000;
  return 15000;
}

// P0.2: Strong fingerprint — HMAC 32 chars + 16B trace
function requestFingerprint(messages) {
  const payload = JSON.stringify(messages);
  return {
    trace_id: crypto.randomBytes(16).toString('hex'),
    payload_hmac: crypto.createHmac('sha256', TRACE_SALT).update(payload).digest('hex').slice(0, 32)
  };
}

// ═══════════════════════════════════════════════════
// KB PRIMITIVES
// ═══════════════════════════════════════════════════

async function kbSave(key, data) {
  const r = await retryFetch(`${KB_API}/save`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: JSON.stringify(data) })
  });
  return r?.ok || false;
}

async function kbRead(key) {  try {    const r = await retryFetch(`${KB_API}/read?key=${encodeURIComponent(key)}`, { timeout: 5000 });    if (!r?.ok) return null;    const j = await r.json();    return JSON.parse(j.entry?.value || j.value || 'null');  } catch { return null; }}

async function kbList(prefix) {
  try {
    const all = [];
    let offset = 0;
    const limit = 200;
    while (true) {
      const r = await retryFetch(`${KB_API}/list?limit=${limit}&offset=${offset}`, { timeout: 10000 });
      if (!r?.ok) break;
      const j = await r.json();
      const keys = (j.entries || []).map(e => e.key).filter(k => k.startsWith(prefix));
      all.push(...keys);
      if (!j.entries || j.entries.length < limit) break;
      offset += limit;
      if (offset > 2000) break;
    }
    return all;
  } catch { return []; }
}
async function kbDelete(key) {  try {    const r = await retryFetch(`${KB_API}/save`, {      method: "POST", headers: { "Content-Type": "application/json" },      body: JSON.stringify({ key, value: "null" }), timeout: 5000    }, 1);    if (r?.ok) return true;  } catch {}  return kbSave(key, { __deleted: true, deleted_at: new Date().toISOString() });}

// ═══════════════════════════════════════════════════
// AUDIT + EVENTS + LOG
// ═══════════════════════════════════════════════════

const LEVELS = {
  start:'INFO',stop:'INFO',msg:'INFO',dispatched:'INFO',verified:'INFO',
  flags_reloaded:'INFO',gate_passed:'INFO',proactive:'INFO',dream:'INFO',tool_exec:'INFO',
  cost_degrade:'WARN',agent_restarted:'WARN',approval_queued:'WARN',
  proactive_alert:'WARN',killswitch:'WARN',direct_api_fallback:'WARN',
  startup_degraded:'WARN',heartbeat_timeout:'WARN',session_rotated:'WARN',
  rate_limited:'WARN',reliability_regression:'WARN',topic_overflow:'WARN',
  excessive_cache_breaks:'WARN',claim_race_lost:'WARN',
  error:'ERROR',circuit_breaker:'ERROR',false_completion:'ERROR',
  gate_rejected:'ERROR',fingerprint_mismatch:'ERROR',denied:'ERROR',
  dispatch_failed:'ERROR',restart_failed:'ERROR',task_aborted:'ERROR',
  injection_detected:'ERROR',secrets_detected:'ERROR',
  model_unavailable:'ERROR',error_budget_exhausted:'ERROR',
  agent_degradation:'ERROR',topic_write_failed:'ERROR',
  memory_write_verify_failed:'ERROR',memory_stale:'ERROR',
  invalid_state_transition:'ERROR',task_state_change:'INFO',
  policy_updated:'INFO',taint_laundering_attempt:'ERROR',
  claim_cas_failed:'WARN',anthropic_direct_failed:'ERROR',
};

function audit(e) {
  const d = new Date();
  const dir = path.join(AUDIT_DIR, `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}`);
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${String(d.getDate()).padStart(2,'0')}.jsonl`);
  atomicAppend(f, JSON.stringify({
    ts: d.toISOString(), level: LEVELS[e.type] || 'INFO',
    trace_id: crypto.randomBytes(4).toString('hex'),
    service: 'sypnose', version: VERSION, ...e,
    fp: crypto.createHash('sha256').update(`${e.type}:${d.getTime()}`).digest('hex').slice(0, 8)
  }) + '\n');
}

function emitEvent(ev) {
  fs.mkdirSync(EVENTS_DIR, { recursive: true });
  const f = path.join(EVENTS_DIR, 'stream.jsonl');
  atomicAppend(f, JSON.stringify({ ...ev, ts: new Date().toISOString() }) + '\n');
  try {
    const l = fs.readFileSync(f, 'utf-8').trim().split('\n');
    if (l.length > 1000) fs.writeFileSync(f, l.slice(-500).join('\n') + '\n');
  } catch {}
}

function log(phase, data) {
  const ts = new Date().toISOString().slice(11, 19);
  if (BRIEF) {
    const s = typeof data === 'object'
      ? Object.entries(data).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join(' ').slice(0, 60)
      : String(data).slice(0, 60);
    console.log(`[${ts}] ${phase} ${s}`);
  } else console.log(`[${ts}] ${phase}`, JSON.stringify(data));
}

// ═══════════════════════════════════════════════════
// MODEL ROUTER + COST
// ═══════════════════════════════════════════════════

const MODEL_MAP = {
  plan_validation: 'gemini-2.5-flash', permission_check: 'gemini-2.0-flash',
  code_noncritical: 'qwen-3-coder-plus', code_critical: 'claude-sonnet-4-6',
  debugging: 'deepseek-r1', bash_scripts: 'qwen-3-coder-flash',
  web_research: 'sonar-pro', doc_analysis: 'gemini-2.5-pro',
  quick_task: 'gemini-2.0-flash', memory_dream: 'gemini-2.0-flash',
  magic_doc: 'qwen-3-coder-plus', audit_task: 'gemini-2.5-flash',
  context_collapse: 'gemini-2.0-flash', ultraplan: 'claude-opus-4-6',
};
const PRICING = { 'claude-sonnet-4-6': [3, 15], 'claude-opus-4-6': [15, 75], 'gemini-2.5-pro': [1.25, 5] };

function preEstimateCost(model, msgs) {
  const chars = msgs.reduce((s, m) => s + (typeof m.content === 'string' ? m.content.length : 100), 0);
  const p = PRICING[model];
  if (!p) return { cost: 0, shouldDegrade: false };
  const cost = (p[0] * Math.ceil(chars / 4) + p[1] * 2000) / 1e6;
  return { cost, shouldDegrade: cost > 0.05 };
}

// P0.3: Anthropic adapter separado
async function callModelAnthropic(messages, maxTokens = 2000, taskId = null) {
  if (!ANTHROPIC_KEY) throw new Error('No ANTHROPIC_API_KEY');
  const fp = requestFingerprint(messages);
  let system = '';
  const adapted = [];
  for (const msg of messages) {
    if (msg.role === 'system') system += (system ? '\n' : '') + msg.content;
    else adapted.push({ role: msg.role, content: msg.content });
  }
  const body = { model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, messages: adapted };
  if (system) body.system = system;

  const res = await retryFetch(ANTHROPIC_DIRECT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01', 'X-Sypnose-Trace': fp.trace_id
    },
    body: JSON.stringify(body), timeout: 60000
  }, 2, [2000, 5000]);

  if (!res?.ok) throw new Error(`Anthropic ${res?.status || 'failed'}`);
  const data = await res.json();
  const result = {
    content: data.content?.map(c => c.text || '').join('') || '',
    model: 'anthropic_direct', tokens: data.usage || {},
    cost: ((data.usage?.input_tokens || 0) * 3 + (data.usage?.output_tokens || 0) * 15) / 1e6,
    free: false, fallback: 'direct', trace_id: fp.trace_id, taskType: 'anthropic_direct'
  };
  if (taskId) await trackTaskCost(taskId, result);
  return result;
}

async function callModel(taskType, messages, maxTokens = 2000, taskId = null) {
  let model = MODEL_MAP[taskType] || 'gemini-2.0-flash';
  const est = preEstimateCost(model, messages);
  if (est.shouldDegrade && taskType !== 'code_critical' && taskType !== 'ultraplan') {
    const o = model; model = 'gemini-2.5-flash';
    audit({ type: 'cost_degrade', from: o, to: model });
  }
  const fp = requestFingerprint(messages);

  // Try 1: SypnoseProxy
  try {
    const r = await retryFetch(PROXY, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Sypnose-Trace': fp.trace_id },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }), timeout: 30000
    }, 2, [1000, 2000]);
    if (r?.ok) {
      const d = await r.json();
      const p = PRICING[model];
      const cost = p ? (p[0] * (d.usage?.input_tokens || 0) + p[1] * (d.usage?.output_tokens || 0)) / 1e6 : 0;
      const result = { content: d.choices?.[0]?.message?.content || '', model, tokens: d.usage || {}, cost, free: !p, taskType };
      if (taskId) await trackTaskCost(taskId, result);
      return result;
    }
  } catch {}

  // Try 2: Direct Anthropic (P0.3 adapter)
  if (model.startsWith('claude') && ANTHROPIC_KEY) {
    try {
      const result = await callModelAnthropic(messages, maxTokens, taskId);
      audit({ type: 'direct_api_fallback', model });
      return result;
    } catch {}
  }

  // Try 3: Queue
  audit({ type: 'model_unavailable', model, taskType });
  return { content: '', model, error: 'All backends unavailable', cost: 0, free: true, queued: true, taskType };
}

async function trackCost(clientId, usage) {
  const key = `cost:${clientId}:${new Date().toISOString().split('T')[0]}`;
  const ex = await kbRead(key) || { total: 0, paid: 0, free_calls: 0, calls: 0, by_model: {}, by_type: {} };
  ex.total += usage.cost || 0; ex.calls++;
  if (usage.free) ex.free_calls++; else ex.paid += usage.cost || 0;
  ex.by_model[usage.model] = (ex.by_model[usage.model] || 0) + 1;
  if (usage.taskType) ex.by_type[usage.taskType] = (ex.by_type[usage.taskType] || 0) + 1;
  await kbSave(key, ex);
}

async function trackTaskCost(taskId, usage) {
  const key = `cost:task:${taskId}`;
  const tc = await kbRead(key) || { total: 0, calls: 0, models: {} };
  tc.total += usage.cost || 0; tc.calls++;
  tc.models[usage.model] = (tc.models[usage.model] || 0) + 1;
  await kbSave(key, tc);
}

// ═══════════════════════════════════════════════════
// SECURITY
// ═══════════════════════════════════════════════════

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i, /new\s+system\s+prompt/i,
  /you\s+are\s+now\s+(DAN|jailbreak|unrestricted)/i,
  /disregard\s+(your|all)\s+(rules|constraints)/i,
  /override\s+(safety|security|permission)/i, /SYSTEM:\s*you\s+are/i,
  /pretend\s+you\s+(are|have)\s+no/i, /act\s+as\s+if/i,
];
function detectInjection(c) {
  if (typeof c !== 'string') c = JSON.stringify(c);
  const m = [];
  for (const p of INJECTION_PATTERNS) if (p.test(c)) m.push(p.source.slice(0, 40));
  if (m.length) audit({ type: 'injection_detected', patterns: m, preview: c.slice(0, 80) });
  return m;
}

const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey)\s*[=:]\s*['"]?[A-Za-z0-9_\-]{20,}/i,
  /(?:password|passwd|pwd)\s*[=:]\s*['"]?[^\s'"]{8,}/i,
  /sk-[A-Za-z0-9]{32,}/, /AIza[A-Za-z0-9_\-]{35}/, /ghp_[A-Za-z0-9]{36}/,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, /\b\d{8}[A-Z]\b/,
];
function detectSecrets(c) {
  if (typeof c !== 'string') return [];
  const f = [];
  for (const p of SECRET_PATTERNS) { const m = c.match(p); if (m) f.push({ p: p.source.slice(0, 30), m: m[0].slice(0, 10) + '***' }); }
  if (f.length) audit({ type: 'secrets_detected', count: f.length });
  return f;
}

const DEGRADATION_SIGNALS = [
  /i('m| am)\s+(confused|stuck|lost|unsure)/i, /i\s+(don't|do not)\s+(understand|know)/i,
  /error.*error.*error/i, /let me try again/i,
  /as i (mentioned|said) (before|earlier)/i, /sorry.*(wrong|mistake|error)/i,
];
function detectDegradation(output) {
  if (typeof output !== 'string') return [];
  const s = [];
  for (const p of DEGRADATION_SIGNALS) if (p.test(output)) s.push(p.source.slice(0, 30));
  if (s.length >= 2) audit({ type: 'agent_degradation', signals: s, preview: output.slice(0, 100) });
  return s;
}

// ═══════════════════════════════════════════════════
// GEMINI GATE
// ═══════════════════════════════════════════════════

async function geminiGate(plan) {
  const L = ['PLAN', 'TAREA', 'MODELO', 'BORIS', 'VERIFICACION', 'EVIDENCIA'];
  const r = await callModel('plan_validation', [
    { role: 'system', content: `Valida 6 etiquetas: ${L.join(',')}. JSON: {"valid":bool,"missing":[],"issues":[]}` },
    { role: 'user', content: typeof plan === 'string' ? plan : JSON.stringify(plan) }
  ], 500);
  try { return JSON.parse(r.content.replace(/```json|```/g, '').trim()); }
  catch { return { valid: false, missing: ['PARSE_ERROR'] }; }
}

// ═══════════════════════════════════════════════════
// MAILBOX — P0.1 CAS atomic claim with lease
// ═══════════════════════════════════════════════════

class Mailbox {
  constructor(id) { this.id = id; }

  async send(to, msg) {
    const key = `mailbox:${to}:${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    return kbSave(key, {
      id: key, from: this.id, to, ...msg,
      created_at: new Date().toISOString(),
      claimed_by: null, ack: false, version: 0
    });
  }

  async receive(limit = 20) {
    const keys = await kbList(`mailbox:${this.id}`);
    const allMsgs = await parallelKbRead(keys.slice(-limit));
    const msgs = [];
    for (let i = 0; i < allMsgs.length; i++) {
      const m = allMsgs[i];
      if (m && !m.ack) { m._key = keys.slice(-limit)[i]; msgs.push(m); }
    }
    return msgs.sort((a, b) => {
      const p = { critical: 0, normal: 1, low: 2 };
      return (p[a.priority] || 1) - (p[b.priority] || 1);
    });
  }

  // P0.1: CAS claim with version + lease
  async claim(key) {
    const msg = await kbRead(key);
    if (!msg || msg.ack) return false;

    const currentVersion = msg.version || 0;
    if (msg.claimed_by && msg.claimed_by !== this.id) {
      if (msg.lease_until && msg.lease_until > Date.now()) return false;
    }

    const claimToken = crypto.randomBytes(8).toString('hex');
    const updated = {
      ...msg, claimed_by: this.id, claimed_at: new Date().toISOString(),
      version: currentVersion + 1, lease_until: Date.now() + 30000, claim_token: claimToken
    };

    const saved = await kbSave(key, updated);
    if (!saved) { audit({ type: 'claim_race_lost', key, agent: this.id }); return false; }

    const verify = await kbRead(key);
    if (verify?.version !== currentVersion + 1 || verify?.claim_token !== claimToken) {
      audit({ type: 'claim_cas_failed', key, agent: this.id });
      return false;
    }
    return { success: true, token: claimToken, lease: updated.lease_until };
  }

  async ack(key) {
    const m = await kbRead(key); if (!m) return;
    m.ack = true; m.acked_at = new Date().toISOString();
    m.version = (m.version || 0) + 1;
    await kbSave(key, m);
  }

  async releaseClaim(key, claimToken) {
    const msg = await kbRead(key);
    if (!msg || msg.claim_token !== claimToken) return false;
    msg.claimed_by = null; msg.claim_token = null; msg.lease_until = null;
    msg.version = (msg.version || 0) + 1;
    await kbSave(key, msg);
    return true;
  }

  async broadcast(ids, msg) { return Promise.all(ids.map(id => this.send(id, msg))); }
}

// ═══════════════════════════════════════════════════
// A2A + TMUX
// ═══════════════════════════════════════════════════

class A2ARouter {
  constructor(agents) { this.agents = new Map(agents.map(a => [a.id, a])); }
  async route(from, to, msg) {
    const mb = new Mailbox(from);
    await mb.send(to, { ...msg, routed: true });
    const t = this.agents.get(to);
    if (t?.tmux_session && tmuxAlive(t.tmux_session)) {
      tmuxSend(t.tmux_session, `[A2A ${from}>${to}] ${msg.payload?.summary || msg.type}`);
      return { delivered: true, channels: ['kb', 'tmux'], realtime: true };
    }
    return { delivered: true, channels: ['kb'] };
  }
  async discover() {
    const p = [];
    try {
      const s = execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null',
        { encoding: 'utf-8', timeout: 3000 }).trim().split('\n').filter(Boolean);
      for (const n of s) p.push({ id: n, type: 'tmux', alive: true });
    } catch {}
    return p;
  }
}

function tmuxSend(s, msg) {
  const e = escapeTmux(msg);
  try { execSync(`tmux send-keys -t "${s}" "${e}" Enter`, { timeout: classifyTimeout(msg) }); return true; }
  catch { return false; }
}
function tmuxCapture(s, n = 20) {
  try { return execSync(`tmux capture-pane -t "${s}" -p | tail -${n}`, { timeout: 5000, encoding: 'utf-8' }); }
  catch { return null; }
}
function tmuxAlive(s) {
  try { execSync(`tmux has-session -t "${s}" 2>/dev/null`); return true; }
  catch { return false; }
}

// ═══════════════════════════════════════════════════
// PERMISSION GATE — 6 layers
// ═══════════════════════════════════════════════════

const RISK = { SAFE: 0, LOW: 1, NORMAL: 2, ELEVATED: 3, DANGEROUS: 4, CRITICAL: 5 };

class PermissionGate {
  constructor() {
    this.denials = 0; this.cd = 0;
    this.deny = [/rm\s+-rf\s+\//, /sudo\s+reboot/, /mkfs/, /dd\s+if=/, /chmod\s+777/, /DROP\s+DATABASE/i, /TRUNCATE/i, /curl.*\|\s*bash/];
    this.allow = [/^bash\(git\s/, /^bash\(ls/, /^bash\(cat/, /^bash\(grep/, /^bash\(head/, /^bash\(tail/, /^bash\(wc/, /^bash\(find/, /^read\(/, /^search\(/];
  }
  classifyRisk(c) {
    if (/delete|drop|truncate|rm\s+-rf|wipe|purge/.test(c)) return RISK.CRITICAL;
    if (/deploy|migration|rollback|restart.*service|systemctl/.test(c)) return RISK.DANGEROUS;
    if (/edit|modify|update|write|install|npm|pip/.test(c)) return RISK.ELEVATED;
    if (/create|mkdir|touch|echo/.test(c)) return RISK.LOW;
    if (/read|status|list|grep|cat|ls|health|search|find/.test(c)) return RISK.SAFE;
    return RISK.NORMAL;
  }
  async evaluate(task, mode = 'auto') {
    const cmd = (task.command || '').toLowerCase(), desc = (task.description || '').toLowerCase();
    const combined = `${desc} ${cmd}`;
    if (!task || (!desc && !cmd)) return { allowed: false, reason: 'L1' };
    for (const r of this.deny) if (r.test(cmd)) return { allowed: false, reason: 'L2' };
    const risk = this.classifyRisk(combined);
    for (const r of this.allow) if (r.test(cmd)) return { allowed: true, reason: 'L4', risk };
    if (mode === 'bypassPermissions') return { allowed: true, reason: 'L5', risk };
    if (mode === 'dontAsk') return { allowed: false, reason: 'L5', risk };
    if (mode === 'plan') return { allowed: false, reason: 'L5', risk, needsApproval: true };
    if (mode === 'acceptEdits' && risk <= RISK.ELEVATED) return { allowed: true, reason: 'L5', risk };
    if (mode === 'auto' && risk <= RISK.NORMAL) return { allowed: true, reason: 'L5', risk };
    if (mode === 'default' && risk <= RISK.LOW) return { allowed: true, reason: 'L5', risk };
    const san = desc.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/gi, '[E]')
      .replace(/\b\d{8}[A-Z]\b/g, '[N]').replace(/sk-[A-Za-z0-9]{10,}/g, '[K]');
    try {
      const r = await callModel('permission_check', [{ role: 'user', content: `SAFE or DANGEROUS:\n${san}\nCmd:${cmd}` }], 5);
      if ((r.content || '').trim().toUpperCase() === 'SAFE') { this.cd = 0; return { allowed: true, reason: 'L6', risk }; }
      this.cd++;
    } catch { this.cd++; }
    if (this.cd >= 3 || this.denials >= 20) { this.cd = 0; return { allowed: false, reason: 'L6:CB', risk, needsApproval: true }; }
    this.denials++;
    return { allowed: false, reason: 'L6', risk, needsApproval: true };
  }
}

// ═══════════════════════════════════════════════════
// FLAGS + ERROR BUDGET + RATE LIMITER + RELIABILITY
// ═══════════════════════════════════════════════════

const FLAGS_PATH = '/opt/sypnose/flags.json';
let gFlags = {};
function loadFlags() { try { gFlags = JSON.parse(fs.readFileSync(FLAGS_PATH, 'utf-8')); } catch {} return gFlags; }
async function flagOn(n, cid) {
  if (cid) { const cf = await kbRead(`flags:${cid}`); if (cf?.[n]?.enabled !== undefined) return cf[n].enabled; }
  return gFlags[n]?.enabled === true;
}
fs.watchFile(FLAGS_PATH, { interval: 5000 }, () => { loadFlags(); audit({ type: 'flags_reloaded' }); });
loadFlags();

class ErrorBudget {
  constructor(max = 20) { this.max = max; this.errors = []; }
  record(e) { this.errors.push({ ts: Date.now(), e }); this.errors = this.errors.filter(x => x.ts > Date.now() - 3600000); }
  get usage() { return this.errors.length / this.max; }
  get mode() { const u = this.usage; if (u >= 1) return 'paused'; if (u >= .8) return 'readonly'; if (u >= .5) return 'conservative'; return 'normal'; }
}

class RateLimiter {
  constructor(max = 100) { this.max = max; this.calls = new Map(); }
  check(id) { const now = Date.now(); let h = this.calls.get(id) || []; h = h.filter(t => t > now - 60000); this.calls.set(id, h); if (h.length >= this.max) { audit({ type: 'rate_limited', agent: id }); return false; } h.push(now); return true; }
}

async function recordReliability(agentId, model, taskId, verified) {
  const k = `reliability:${agentId}`;
  const r = await kbRead(k) || { tasks: 0, verified: 0, rejected: 0, by_model: {} };
  r.tasks++; if (verified) r.verified++; else r.rejected++;
  if (!r.by_model[model]) r.by_model[model] = { ok: 0, fail: 0 };
  if (verified) r.by_model[model].ok++; else r.by_model[model].fail++;
  r.rate = r.tasks > 0 ? Math.round(100 * r.verified / r.tasks) : 0;
  r.updated = new Date().toISOString();
  await kbSave(k, r);
}

async function detectRegressions(agentId) {
  const cur = await kbRead(`reliability:${agentId}`); if (!cur || cur.tasks < 10) return null;
  const hk = `reliability:history:${agentId}`;
  const hist = await kbRead(hk) || { snapshots: [] };
  const today = new Date().toISOString().split('T')[0];
  const last = hist.snapshots[hist.snapshots.length - 1];
  if (!last || last.date !== today) {
    hist.snapshots.push({ date: today, rate: cur.rate, tasks: cur.tasks });
    if (hist.snapshots.length > 30) hist.snapshots = hist.snapshots.slice(-30);
    await kbSave(hk, hist);
  }
  if (hist.snapshots.length >= 7) {
    const avg = Math.round(hist.snapshots.slice(-7).reduce((s, x) => s + x.rate, 0) / 7);
    if (cur.rate < avg - 10) {
      audit({ type: 'reliability_regression', agent: agentId, current: cur.rate, avg7: avg });
      return { regression: true, current: cur.rate, avg };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════
// HEALTH + ENV PROBE
// ═══════════════════════════════════════════════════

const latH = { kb: [], proxy: [] };
async function healthCheck() {
  const r = { kb: { status: '?', ms: 0 }, proxy: { status: '?', ms: 0 } };
  let t0 = Date.now();
  try { const h = await retryFetch(KB_API.replace('/api', '') + '/health', { timeout: 5000 }, 1); r.kb = { status: h?.ok ? 'ok' : 'degraded', ms: Date.now() - t0 }; } catch { r.kb = { status: 'down', ms: Date.now() - t0 }; }
  latH.kb.push(r.kb.ms); if (latH.kb.length > 60) latH.kb.shift();
  r.kb.avg = Math.round(latH.kb.reduce((a, b) => a + b, 0) / latH.kb.length);
  r.kb.trend = latH.kb.length > 5 ? (latH.kb.slice(-5).reduce((a, b) => a + b, 0) / 5 > r.kb.avg * 2 ? 'degrading' : 'stable') : 'unknown';
  t0 = Date.now();
  try { const h = await retryFetch('http://localhost:8317/', { timeout: 5000 }, 1); r.proxy = { status: h?.ok ? 'ok' : 'degraded', ms: Date.now() - t0 }; } catch { r.proxy = { status: 'down', ms: Date.now() - t0 }; }
  return r;
}

async function envProbe(c) {
  const p = { client: c.id, ts: new Date().toISOString() };
  try { p.git = execSync(`cd ${c.project_dir} && git rev-parse --abbrev-ref HEAD`, { encoding: 'utf-8', timeout: 3000 }).trim(); } catch { p.git = '?'; }
  try { p.disk = execSync(`df -h ${c.project_dir} | tail -1 | awk '{print $4}'`, { encoding: 'utf-8', timeout: 3000 }).trim(); } catch { p.disk = '?'; }
  p.tmux = tmuxAlive(c.tmux_session) ? 'alive' : 'dead';
  await kbSave(`context:${c.id}:env-probe`, p);
  return p;
}

// ═══════════════════════════════════════════════════
// COORDINATOR LOOP — 7 yields
// ═══════════════════════════════════════════════════

class CoordinatorLoop {
  constructor(config) {
    this.clients = config.clients || [];
    this.mailbox = new Mailbox('coordinator');
    this.a2a = new A2ARouter(this.clients);
    this.gate = new PermissionGate();
    this.errorBudget = new ErrorBudget(20);
    this.rateLimiter = new RateLimiter(100);
    this.running = false; this.errors = 0; this.approvalQ = []; this.tick = 0;
  }

  async startup() {
    audit({ type: 'start', agents: this.clients.map(c => c.id), version: VERSION });
    try { execSync('which tmux', { timeout: 3000 }); } catch { console.error('FATAL: no tmux'); process.exit(1); }
    let kbOk = false;
    for (let i = 0; i < 3; i++) {
      try { const r = await retryFetch(KB_API.replace('/api', '') + '/health', { timeout: 5000 }, 1); if (r?.ok) { kbOk = true; break; } } catch {}
      console.warn(`KB retry ${i + 1}/3...`); await sleep(30000);
    }
    if (!kbOk) { console.warn('KB unavailable — degraded'); audit({ type: 'startup_degraded' }); }
    for (const c of this.clients) { const p = await envProbe(c); log('probe', { id: c.id, git: p.git, disk: p.disk, tmux: p.tmux }); }
  }

  async *run() {
    await this.startup(); this.running = true;
    while (this.running) {
      this.tick++; const t0 = Date.now(); const bm = this.errorBudget.mode;
      if (bm === 'paused') { audit({ type: 'error_budget_exhausted' }); await this.mailbox.send('sm', { type: 'emergency', payload: { msg: 'Budget 100%' }, priority: 'critical' }); await sleep(300000); continue; }
      try {
        const msgs = await this.mailbox.receive();
        yield { y: 1, phase: 'mailbox', count: msgs.length, budget: bm };
        for (const m of msgs) {
          const claimResult = await this.mailbox.claim(m._key);
          if (claimResult && claimResult.success) { await this.handle(m); await this.mailbox.ack(m._key); }
        }
        if (await flagOn('HEALTH_MONITORING')) {
          const h = await healthCheck();
          yield { y: 2, phase: 'health', kb: h.kb.status, proxy: h.proxy.status, trend: h.kb.trend };
          emitEvent({ type: 'health', ...h });
          if (await flagOn('PROACTIVE')) for (const c of this.clients) if (!tmuxAlive(c.tmux_session)) await this.restartAgent(c.id);
        }
        if (this.approvalQ.length > 0) { yield { y: 3, phase: 'approvals', pending: this.approvalQ.length }; await this.checkApprovals(); }
        if (await flagOn('PROACTIVE') && bm === 'normal') {
          const t1 = Date.now(); const acts = await this.proactiveScan();
          for (const a of acts) { if (Date.now() - t1 > TICK_BUDGET) break; await this.proactiveExec(a); }
          yield { y: 4, phase: 'proactive', count: acts.length, ms: Date.now() - t1 };
        }
        const budgets = {};
        for (const c of this.clients) { const cost = await kbRead(`cost:${c.id}:${new Date().toISOString().split('T')[0]}`); budgets[c.id] = { cost: (cost?.total || 0).toFixed(4), calls: cost?.calls || 0, free: cost?.calls ? Math.round(100 * (cost.free_calls || 0) / cost.calls) + '%' : '100%' }; }
        yield { y: 5, phase: 'budgets', data: budgets }; emitEvent({ type: 'budgets', data: budgets });
        // Heartbeat + persist flags al KB (cada tick)
        await kbSave("heartbeat:coordinator", { ts: new Date().toISOString(), tick: this.tick, uptime: Math.round(process.uptime()), clients: this.clients.length, version: VERSION });
        if (this.tick % 10 === 0) await kbSave("policies:flags", gFlags);
        if (await flagOn('MAGIC_DOCS') && this.tick % 60 === 0) {
          for (const c of this.clients) { if (!tmuxAlive(c.tmux_session)) continue; const out = tmuxCapture(c.tmux_session, 2); if (out?.trim().endsWith('$')) tmuxSend(c.tmux_session, 'find . -name "*.md" -exec grep -l "MAGIC DOC" {} \\; 2>/dev/null | head -3'); }
          yield { y: 6, phase: 'magic_docs' };
        }
        this.errors = 0; const sleepMs = Math.max(INTERVAL - (Date.now() - t0), 5000);
        yield { y: 7, phase: 'sleep', ms: sleepMs, tick: this.tick }; await sleep(sleepMs);
      } catch (e) {
        this.errors++; this.errorBudget.record(e.message);
        audit({ type: 'error', msg: e.message, n: this.errors, budget: this.errorBudget.usage.toFixed(2) });
        if (this.errors >= MAX_ERRORS) { audit({ type: 'circuit_breaker' }); yield { y: 'CB', phase: 'circuit_breaker' }; await sleep(300000); this.errors = 0; }
        else await sleep(INTERVAL * 2);
      }
    }
    audit({ type: 'stop', ticks: this.tick });
  }

  async handle(m) {
    audit({ type: 'msg', from: m.from, msgType: m.type });
    const inj = detectInjection(JSON.stringify(m.payload || ''));
    if (inj.length) { await this.mailbox.send(m.from, { type: 'injection_blocked', payload: { patterns: inj }, priority: 'critical' }); return; }
    switch (m.type) {
      case 'task_dispatch': return this.dispatch(m);
      case 'task_complete': return this.verify(m);
      case 'approval_response': return this.processApproval(m);
      case 'a2a_forward': return this.a2a.route(m.from, m.payload.to, m.payload);
      case 'status_request': return this.sendStatus(m.from);
      case 'webhook_event': return this.handleWebhook(m);
      case 'ultraplan_request': return this.ultraplan(m);
      case 'reload_flags': loadFlags(); return;
      case 'force_compact': { const c = this.clients.find(x => x.id === m.payload?.client_id); if (c && tmuxAlive(c.tmux_session)) tmuxSend(c.tmux_session, '/compact'); return; }
      case 'command': { const { executeCommand } = require('../lib/commands'); const r = await executeCommand(m.payload.command, this, m.payload.args); await this.mailbox.send(m.from, { type: 'command_result', payload: r, priority: 'low' }); return; }
      case 'emergency_stop': { const c = this.clients.find(x => x.id === m.payload?.client_id); if (c) { try { execSync(`tmux kill-session -t "${c.tmux_session}"`); } catch {} } audit({ type: 'killswitch', action: 'stop', agent: m.payload?.client_id }); return; }
      case 'pause_all': for (const c of this.clients) tmuxSend(c.tmux_session, '/stop'); audit({ type: 'killswitch', action: 'pause_all' }); return;
      case 'resume_all': for (const c of this.clients) if (!tmuxAlive(c.tmux_session)) await this.restartAgent(c.id); return;
      case 'abort_task': { const { task_id, client_id } = m.payload; const t = await kbRead(`task:${client_id}:${task_id}`); if (t) { t.status = 'aborted'; t.aborted_at = new Date().toISOString(); await kbSave(`task:${client_id}:${task_id}`, t); const c = this.clients.find(x => x.id === client_id); if (c && tmuxAlive(c.tmux_session)) tmuxSend(c.tmux_session, `ABORT tarea ${task_id}`); audit({ type: 'task_aborted', task: task_id }); } return; }
      case 'shutdown_request': this.running = false; return;
    }
  }

  async dispatch(m) {
    const task = m.payload; const client = this.clients.find(c => c.id === task.client_id); if (!client) return;
    if (this.errorBudget.mode === 'readonly' && this.gate.classifyRisk((task.description || '').toLowerCase()) > RISK.SAFE) { await this.mailbox.send(m.from, { type: 'budget_restricted', payload: { task_id: task.id }, priority: 'critical' }); return; }
    if (!this.rateLimiter.check(client.id)) { await this.mailbox.send(m.from, { type: 'rate_limited', payload: { client_id: client.id }, priority: 'critical' }); return; }
    // P0.2: Strong fingerprint
    task.fingerprint = { trace_id: crypto.randomBytes(16).toString('hex'), hmac: crypto.createHmac('sha256', TRACE_SALT).update(`${task.id}:${client.id}:${JSON.stringify(task.description || '')}`).digest('hex').slice(0, 32) };
    const secrets = detectSecrets(JSON.stringify(task)); if (secrets.length) { await this.mailbox.send(m.from, { type: 'secrets_in_task', payload: { task_id: task.id, secrets }, priority: 'critical' }); return; }
    if (task.is_plan) { const gate = await geminiGate(task); if (!gate.valid) { await this.mailbox.send(m.from, { type: 'plan_rejected', payload: { gate }, priority: 'critical' }); audit({ type: 'gate_rejected', task: task.id }); return; } }
    const perm = await this.gate.evaluate(task, 'auto');
    if (!perm.allowed && perm.needsApproval) { this.approvalQ.push({ client, task, from: m.from, at: new Date() }); await this.mailbox.send('sm', { type: 'approval_needed', payload: { task, risk: perm.risk }, priority: 'critical' }); return; }
    if (!perm.allowed) { audit({ type: 'denied', task: task.id }); return; }
    const kbKey = `task:${client.id}:${task.id || Date.now()}`;
    await kbSave(kbKey, { ...task, dispatched_at: new Date().toISOString(), status: 'dispatched' });
    await kbSave(`recording:${client.id}:${Date.now()}`, { type: 'dispatch', task_id: task.id, kbKey, ts: new Date().toISOString() });
    if (tmuxAlive(client.tmux_session)) { tmuxSend(client.tmux_session, `Lee tarea ${kbKey} en KB. FP:${task.fingerprint.hmac.slice(0,8)}. Verifica Boris.`); await sleep(3000); audit({ type: 'dispatched', task: task.id, session: client.tmux_session }); emitEvent({ type: 'dispatch', client: client.id, task: task.id }); }
    else if (await flagOn('PROACTIVE')) await this.restartAgent(client.id);
  }

  async verify(m) {
    const { task_id, client_id, evidence, fingerprint, model_used } = m.payload;
    const task = await kbRead(`task:${client_id}:${task_id}`);
    // P0.2: strong fingerprint comparison
    const fpMatch = typeof task?.fingerprint === 'object' ? task.fingerprint.hmac === fingerprint?.hmac : task?.fingerprint === fingerprint;
    if (task?.fingerprint && !fpMatch) { audit({ type: 'fingerprint_mismatch', task: task_id }); await this.mailbox.send(m.from, { type: 'verification_failed', payload: { task_id, reason: 'BORIS: fingerprint mismatch' }, priority: 'critical' }); await recordReliability(m.from, model_used || '?', task_id, false); return; }
    const checks = [];
    if (evidence?.screenshot) checks.push('screenshot'); if (evidence?.grep_count !== undefined) checks.push('grep');
    if (evidence?.file_exists) checks.push('file'); if (evidence?.test_output) checks.push('test');
    if (evidence?.curl_response) checks.push('curl'); if (evidence?.page_text) checks.push('page');
    const ok = checks.length >= 2;
    if (!ok) { audit({ type: 'false_completion', task: task_id, agent: m.from, evidence: checks }); await this.mailbox.send(m.from, { type: 'verification_failed', payload: { task_id, reason: 'BORIS: sin evidencia', need: '>=2', got: checks }, priority: 'critical' }); }
    else { if (task) { task.status = 'verified'; task.verified_at = new Date().toISOString(); task.evidence = evidence; await kbSave(`task:${client_id}:${task_id}`, task); } audit({ type: 'verified', task: task_id, evidence: checks }); emitEvent({ type: 'verified', client: client_id, task: task_id }); }
    await recordReliability(m.from, model_used || '?', task_id, ok);
    await detectRegressions(m.from);
  }

  async ultraplan(m) { const { planning_prompt, client_id, task_id } = m.payload; audit({ type: 'ultraplan_start', task: task_id }); const r = await callModel('ultraplan', [{ role: 'system', content: 'Decompose into detailed checklist with dependencies.' }, { role: 'user', content: planning_prompt }], 8000, task_id); await trackCost(client_id, r); await kbSave(`ultraplan:${client_id}:${task_id}`, { plan: r.content, model: r.model, cost: r.cost, created_at: new Date().toISOString(), status: 'awaiting_approval' }); await this.mailbox.send('sm', { type: 'ultraplan_ready', payload: { task_id, preview: r.content.slice(0, 500) }, priority: 'normal' }); }

  async handleWebhook(m) {
    const { source, event, payload } = m.payload || {}; audit({ type: 'webhook', source });
    if (source === 'github' && event === 'pull_request' && payload?.action === 'closed' && payload?.pull_request?.merged) { const pr = payload.pull_request; const c = this.clients.find(x => x.repo === payload?.repository?.name); if (c) await this.dispatch({ payload: { client_id: c.id, id: `gh-pr-${pr.number}`, description: `Review merged PR #${pr.number}: ${pr.title}`, is_plan: false }, from: 'webhook' }); }
    else if (source === 'linear' && payload?.action === 'create' && payload?.data) { const issue = payload.data; const c = this.clients[0]; if (c) await kbSave(`task:${c.id}:linear-${issue.id}`, { id: `linear-${issue.id}`, client_id: c.id, description: `[Linear] ${issue.title}`, priority: (issue.priority || 5) <= 1 ? 'critical' : 'normal', status: 'pending', created_at: new Date().toISOString() }); }
    else if (source === 'whatsapp') { const text = payload?.message?.text?.body || ''; if (text) await this.mailbox.send('sm', { type: 'whatsapp_message', payload: { text, from: payload?.message?.from }, priority: text.toLowerCase().includes('urgente') ? 'critical' : 'normal' }); }
  }

  async proactiveScan() {
    const acts = [];
    for (const c of this.clients) {
      const keys = await kbList(`task:${c.id}:`); const tasks = await parallelKbRead(keys.slice(-20));
      for (let i = 0; i < tasks.length; i++) { const t = tasks[i]; if (t?.status === 'dispatched') { const age = (Date.now() - new Date(t.dispatched_at).getTime()) / 3600000; if (age > 24) acts.push({ type: 'stale', client: c.id, key: keys.slice(-20)[i], hours: Math.round(age) }); } }
      if (!tmuxAlive(c.tmux_session)) acts.push({ type: 'dead', client: c.id });
      const probe = await kbRead(`context:${c.id}:env-probe`);
      if (probe?.ts && (Date.now() - new Date(probe.ts).getTime()) / 3600000 > MAX_SESSION_HOURS) acts.push({ type: 'session_long', client: c.id, hours: Math.round((Date.now() - new Date(probe.ts).getTime()) / 3600000) });
    }
    return acts;
  }

  async proactiveExec(a) {
    if (a.type === 'stale') await this.mailbox.send('sm', { type: 'proactive_alert', payload: { ...a, msg: `Tarea ${a.hours}h: ${a.key}` }, priority: 'normal' });
    else if (a.type === 'dead') await this.restartAgent(a.client);
    else if (a.type === 'session_long') { const c = this.clients.find(x => x.id === a.client); if (c && tmuxAlive(c.tmux_session)) { tmuxSend(c.tmux_session, '/compact'); await sleep(5000); await this.restartAgent(a.client); audit({ type: 'session_rotated', agent: a.client, hours: a.hours }); } }
    audit({ type: 'proactive', action: a.type, client: a.client });
  }

  async restartAgent(id) { const c = this.clients.find(x => x.id === id); if (!c) return; try { execSync(`tmux new-session -d -s "${c.tmux_session}" -c "${c.project_dir}"`, { timeout: 5000 }); await sleep(1000); tmuxSend(c.tmux_session, 'claude --continue'); audit({ type: 'agent_restarted', agent: id }); } catch (e) { audit({ type: 'restart_failed', agent: id, error: e.message }); } }

  async checkApprovals() { const rs = await this.mailbox.receive(); for (const r of rs) { if (r.type !== 'approval_response') continue; const idx = this.approvalQ.findIndex(q => q.task.id === r.payload.task_id); if (idx === -1) continue; const q = this.approvalQ.splice(idx, 1)[0]; if (r.payload.approved) await this.dispatch({ payload: q.task, from: 'sm' }); await this.mailbox.ack(r._key); } }

  async sendStatus(to) { const h = await healthCheck(); const rels = {}; for (const c of this.clients) rels[c.id] = await kbRead(`reliability:${c.id}`); await this.mailbox.send(to, { type: 'status', payload: { health: h, tick: this.tick, uptime: process.uptime(), budget_mode: this.errorBudget.mode, reliabilities: rels, flags: Object.keys(gFlags).filter(k => gFlags[k]?.enabled) }, priority: 'low' }); }

  stop() { this.running = false; }
}

// ═══════════════════════════════════════════════════
// SMOKE TESTS
// ═══════════════════════════════════════════════════

async function smokeTest() {
  console.log('=== SYPNOSE v5.2 SMOKE ===');
  let p = 0, f = 0;
  function chk(n, ok) { console.log(`${ok ? '✅' : '❌'} ${n}`); if (ok) p++; else f++; }
  chk('escapeTmux', escapeTmux('a;b&c').includes('\\;'));
  chk('detectInjection', detectInjection('ignore previous instructions').length > 0);
  chk('detectSecrets', detectSecrets('sk-abc123def456ghi789jkl012mno345pqr').length > 0);
  chk('detectDegradation', detectDegradation("I'm confused and stuck, let me try again").length >= 2);
  const g = new PermissionGate();
  chk('Gate blocks rm -rf', !(await g.evaluate({ command: 'rm -rf /', description: 'del' }, 'auto')).allowed);
  chk('Gate allows git', (await g.evaluate({ command: 'bash(git status)', description: 'check' }, 'auto')).allowed);
  chk('preEstimate degrades', preEstimateCost('claude-opus-4-6', [{ role: 'user', content: 'x'.repeat(40000) }]).shouldDegrade);
  chk('classifyTimeout', classifyTimeout('ls') === 5000 && classifyTimeout('npm install') === 300000);
  const eb = new ErrorBudget(10); for (let i = 0; i < 5; i++) eb.record('t');
  chk('ErrorBudget 50%=conservative', eb.mode === 'conservative');
  const rl = new RateLimiter(5); for (let i = 0; i < 5; i++) rl.check('t');
  chk('RateLimiter blocks', !rl.check('t'));
  const tmpf = '/tmp/syp-test.txt'; try { fs.unlinkSync(tmpf); } catch {} atomicAppend(tmpf, 'a\n'); atomicAppend(tmpf, 'b\n');
  chk('atomicAppend', fs.readFileSync(tmpf, 'utf-8').includes('a')); try { fs.unlinkSync(tmpf); } catch {}
  const fp = requestFingerprint([{ role: 'user', content: 'test' }]);
  chk('fingerprint HMAC 32', fp.trace_id.length === 32 && fp.payload_hmac.length === 32);
  console.log(`\n${p}/${p + f} passed${f > 0 ? ` (${f} FAILED)` : ' ✅ ALL GREEN'}`);
  return f === 0;
}

module.exports = {
  CoordinatorLoop, Mailbox, A2ARouter, PermissionGate, ErrorBudget, RateLimiter,
  geminiGate, callModel, callModelAnthropic, audit, emitEvent, trackCost, trackTaskCost, log,
  kbSave, kbRead, kbList, kbDelete, parallelKbRead,
  tmuxSend, tmuxCapture, tmuxAlive, escapeTmux, classifyTimeout,
  loadFlags, flagOn, detectInjection, detectSecrets, detectDegradation,
  preEstimateCost, recordReliability, detectRegressions, healthCheck, envProbe,
  atomicAppend, retryFetch, requestFingerprint, sleep, smokeTest,
  RISK, VERSION, WEBHOOK_TOKEN,
};
