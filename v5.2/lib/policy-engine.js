'use strict';
const { kbRead, kbSave, audit } = require('../core/loop');

class PolicyEngine {
  constructor(clientId) { this.clientId = clientId; this._cache = null; }

  async load() {
    if (this._cache) return this._cache;
    let p = await kbRead(`policies:${this.clientId}`);
    if (!p) {
      p = { default_mode: 'auto', tools: {}, risk_actions: {}, allowlist: [], denylist: [], version: 1 };
      await this.save(p);
    }
    this._cache = p;
    return p;
  }

  async save(p) { p.updated_at = new Date().toISOString(); await kbSave(`policies:${this.clientId}`, p); this._cache = p; }

  async evaluate(task, riskLevel) {
    const p = await this.load();
    const cmd = task.command || '';
    for (const pattern of p.denylist) { try { if (new RegExp(pattern, 'i').test(cmd)) return { allowed: false, reason: 'policy_deny', layer: 1 }; } catch {} }
    for (const pattern of p.allowlist) { try { if (new RegExp(pattern, 'i').test(cmd)) return { allowed: true, reason: 'policy_allow', layer: 2 }; } catch {} }
    const toolPolicy = p.tools[task.tool_name || 'default'];
    if (toolPolicy?.risk_max !== undefined && riskLevel > toolPolicy.risk_max) return { allowed: false, reason: 'policy_tool_risk', layer: 3, needsApproval: true };
    const action = p.risk_actions[riskLevel] || p.default_mode;
    if (action === 'deny') return { allowed: false, reason: 'policy_risk_deny', layer: 4 };
    if (action === 'approval') return { allowed: false, reason: 'policy_needs_approval', layer: 4, needsApproval: true };
    return { allowed: true, reason: 'policy_auto', layer: 4 };
  }

  async setToolPolicy(toolName, config) {
    const p = await this.load(); p.tools[toolName] = config; p.version = (p.version || 0) + 1;
    await this.save(p); audit({ type: 'policy_updated', client: this.clientId, tool: toolName, config });
  }

  async addDenyPattern(pattern) {
    try { new RegExp(pattern); } catch { throw new Error(`Invalid regex: ${pattern}`); }
    const p = await this.load(); if (!p.denylist.includes(pattern)) p.denylist.push(pattern); await this.save(p);
  }
}

module.exports = { PolicyEngine };
