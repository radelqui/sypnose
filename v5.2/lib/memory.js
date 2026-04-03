'use strict';
const crypto = require('crypto');
const { kbSave, kbRead, kbList, kbDelete, callModel, parallelKbRead, retryFetch, audit } = require('../core/loop');

class Memory3Layer {
  constructor(cid) {
    this.cid = cid; this.indexCache = null; this.topicCache = new Map();
    this.MAX_IDX = 200; this.MAX_TOPIC = 25000; this.CACHE_TTL = 300000;
  }

  // ═══ CAPA 1: INDEX ═══
  async loadIndex() {
    if (this.indexCache) return this.indexCache;
    this.indexCache = await kbRead(`mem:idx:${this.cid}`) || { client_id: this.cid, entries: [], updated_at: '' };
    return this.indexCache;
  }

  async updateIndexEntry(topic, summary) {
    const idx = await this.loadIndex();
    const entry = { topic, summary: String(summary).slice(0, 140), updated: new Date().toISOString().slice(0, 10) };
    const i = idx.entries.findIndex(e => e.topic === topic);
    if (i >= 0) idx.entries[i] = entry; else idx.entries.push(entry);
    if (idx.entries.length > this.MAX_IDX) idx.entries = idx.entries.slice(-this.MAX_IDX);
    idx.updated_at = new Date().toISOString();
    this.indexCache = idx;
    await kbSave(`mem:idx:${this.cid}`, idx);
  }

  findRelevant(q) {
    if (!this.indexCache?.entries) return [];
    const ql = q.toLowerCase();
    return this.indexCache.entries
      .filter(e => e.topic.toLowerCase().includes(ql) || e.summary.toLowerCase().includes(ql))
      .map(e => e.topic);
  }

  // ═══ CAPA 2: TOPICS — v2 with hash + version + strict write ═══
  async loadTopic(name) {
    const c = this.topicCache.get(name);
    if (c && Date.now() - c.ts < this.CACHE_TTL) return c.data;
    const d = await kbRead(`mem:topic:${this.cid}:${name}`);
    if (d) this.topicCache.set(name, { data: d, ts: Date.now() });
    return d;
  }

  async saveTopic(name, content) {
    const prev = await this.loadTopic(name);
    const contentStr = JSON.stringify(content);
    const size = contentStr.length;
    const hash = crypto.createHash('sha256').update(contentStr).digest('hex').slice(0, 12);

    if (size > this.MAX_TOPIC) audit({ type: 'topic_overflow', topic: name, size, client: this.cid });

    // Skip if unchanged
    if (prev?.hash === hash) return { saved: false, reason: 'unchanged', version: prev.version, hash };

    const version = (prev?.version || 0) + 1;
    const topic = {
      topic: name, client_id: this.cid, content,
      version, hash, prev_hash: prev?.hash || null,
      size_bytes: size, updated_at: new Date().toISOString()
    };

    // Strict Write Discipline: write topic FIRST
    const writeOk = await kbSave(`mem:topic:${this.cid}:${name}`, topic);
    if (!writeOk) {
      audit({ type: 'topic_write_failed', topic: name, client: this.cid });
      return { saved: false, reason: 'write_failed' };
    }

    this.topicCache.set(name, { data: topic, ts: Date.now() });
    // THEN update index
    await this.updateIndexEntry(name, `v${version} ${hash.slice(0, 6)} ${(typeof content === 'string' ? content : contentStr).slice(0, 100)}`);
    return { saved: true, version, hash, prev_version: prev?.version || 0 };
  }

  async saveTopicVerified(name, content) {
    const result = await this.saveTopic(name, content);
    if (!result.saved) return result;
    const rb = await this.loadTopic(name);
    if (!rb) { audit({ type: 'memory_write_verify_failed', topic: name }); return { ...result, verified: false }; }
    return { ...result, verified: true };
  }

  async initDefaultTopics(profile = {}) {
    const defaults = {
      agents: { deployed: profile.agents || [], sessions: {}, health: {} },
      infra: { server: profile.server || 'contabo', ports: {}, services: [] },
      issues: { open: [], resolved: [], boris_violations: 0 },
      contacts: { all: profile.contacts || [] },
      workflows: { active: [], scheduled: [] },
      boris_rules: { rules: [], false_completions: 0, learned: [] }
    };
    for (const [n, c] of Object.entries(defaults)) { if (!(await this.loadTopic(n))) await this.saveTopic(n, c); }
    return Object.keys(defaults);
  }

  // Self-healing: verify fact against reality
  async verifyFact(topicName, factKey, cmd) {
    const t = await this.loadTopic(topicName);
    if (!t?.content) return { verified: false, reason: 'no topic' };
    const stored = t.content[factKey];
    if (stored === undefined) return { verified: false, reason: 'no fact' };
    if (cmd) {
      try {
        const { execSync } = require('child_process');
        const actual = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
        const ok = String(stored).trim() === actual;
        if (!ok) audit({ type: 'memory_stale', topic: topicName, key: factKey });
        return { verified: ok, stored, actual };
      } catch (e) { return { verified: false, reason: e.message }; }
    }
    return { verified: true, value: stored, source: 'hint' };
  }

  // ═══ CAPA 3: TRANSCRIPTS ═══
  async appendTranscript(ev) {
    await kbSave(`mem:tx:${this.cid}:${new Date().toISOString().split('T')[0]}:${Date.now()}`,
      { ...ev, client_id: this.cid, ts: new Date().toISOString() });
  }

  async searchTranscripts(q, limit = 10) {
    try {
      const r = await retryFetch(`${process.env.KB_API || 'http://localhost:18791/api'}/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mem:tx:${this.cid} ${q}`, limit }), timeout: 10000
      }, 3, [500, 1000, 2000]);
      return r?.ok ? ((await r.json()).results || []) : [];
    } catch { return []; }
  }

  async loadForTask(desc) {
    await this.loadIndex();
    const rel = this.findRelevant(desc).slice(0, 3);
    const topics = {};
    for (const t of rel) topics[t] = await this.loadTopic(t);
    return { index: this.indexCache, topics };
  }

  // ═══ AUTODREAM ═══
  async shouldDream() {
    const s = await kbRead(`mem:dream:${this.cid}`);
    if (!s) return true;
    return (Date.now() - new Date(s.last_dream).getTime()) / 3600000 >= 24 && (s.sessions_since || 0) >= 5;
  }

  async dream() {
    const lk = `mem:dream-lock:${this.cid}`;
    const lock = await kbRead(lk);
    if (lock && (Date.now() - new Date(lock.acquired).getTime()) < 3600000) return { status: 'locked' };
    await kbSave(lk, { acquired: new Date().toISOString() });
    const log = []; let consolidated = 0;
    try {
      const idx = await this.loadIndex();
      const names = idx.entries.map(e => e.topic);
      log.push(`orient:${names.length}`);
      const keys = names.map(n => `mem:topic:${this.cid}:${n}`);
      const raw = await parallelKbRead(keys);
      const topics = {};
      names.forEach((n, i) => { if (raw[i]) topics[n] = raw[i]; });
      log.push(`gather:${Object.keys(topics).length}`);

      for (const [name, td] of Object.entries(topics)) {
        const r = await callModel('memory_dream', [{
          role: 'user',
          content: `Consolida topic. Reglas:\n1. Fechas relativas->absolutas (hoy=${new Date().toISOString().split('T')[0]})\n2. Contradictorios: nuevo gana\n3. Fusionar duplicados\n4. Eliminar derivables\n5. <25KB\nJSON consolidado:\n${JSON.stringify(td?.content || td, null, 2)}`
        }], 4000);
        if (r.content && !r.error) {
          try {
            await this.saveTopic(name, JSON.parse(r.content.replace(/```json|```/g, '').trim()));
            consolidated++; log.push(`ok:${name}`);
          } catch { log.push(`skip:${name}`); }
        }
      }

      if (this.indexCache) {
        this.indexCache.entries = this.indexCache.entries.slice(-this.MAX_IDX);
        await kbSave(`mem:idx:${this.cid}`, this.indexCache);
      }

      const mbKeys = await kbList(`mailbox:${this.cid}`);
      let cleaned = 0;
      for (const k of mbKeys) {
        const m = await kbRead(k);
        if (m?.ack && (Date.now() - new Date(m.created_at || 0).getTime()) / 86400000 > 7) {
          await kbDelete(k); cleaned++;
        }
      }
      log.push(`cleanup:${cleaned}`);

      await kbSave(`mem:dream:${this.cid}`, {
        last_dream: new Date().toISOString(), sessions_since: 0,
        topics_consolidated: consolidated, log
      });
      audit({ type: 'dream', client: this.cid, consolidated, log });
      return { status: 'ok', consolidated, log };
    } finally { await kbDelete(lk); }
  }

  async incrementSessionCount() {
    const s = await kbRead(`mem:dream:${this.cid}`) || { sessions_since: 0 };
    s.sessions_since = (s.sessions_since || 0) + 1;
    await kbSave(`mem:dream:${this.cid}`, s);
  }
}

module.exports = { Memory3Layer };
