'use strict';
const { kbSave, kbRead, kbList } = require('../core/loop');

class Telemetry {
  constructor(clientId) { this.clientId = clientId; }

  async recordPhase(phase, duration_ms) {
    const today = new Date().toISOString().split('T')[0];
    const key = `telemetry:${this.clientId}:${today}:${phase}`;
    const rec = await kbRead(key) || { count: 0, total_ms: 0, max_ms: 0, min_ms: Infinity };
    rec.count++; rec.total_ms += duration_ms;
    rec.avg_ms = Math.round(rec.total_ms / rec.count);
    if (duration_ms > rec.max_ms) rec.max_ms = duration_ms;
    if (duration_ms < rec.min_ms) rec.min_ms = duration_ms;
    await kbSave(key, rec);
    return rec;
  }

  async dailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const allKeys = await kbList(`telemetry:${this.clientId}:`);
    const todayKeys = allKeys.filter(k => k.includes(today));
    const report = {};
    for (const key of todayKeys) { report[key.split(':').pop()] = await kbRead(key); }
    return report;
  }
}

module.exports = Telemetry;
