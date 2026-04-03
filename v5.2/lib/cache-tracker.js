'use strict';
const { kbSave, kbRead, audit } = require('../core/loop');
const VECTORS = ['claude_md_changed', 'tools_changed', 'permission_mode_changed', 'mcp_changed', 'git_branch_changed', 'env_changed', 'system_prompt_edited', 'client_config_changed', 'flags_changed', 'agent_restarted', 'session_rotated', 'compaction_ran', 'model_switched', 'worktree_created'];

class CacheTracker {
  constructor(cid) { this.cid = cid; }
  async record(vector, details = '') {
    if (!VECTORS.includes(vector)) return;
    const today = new Date().toISOString().split('T')[0];
    const k = `cache:breaks:${this.cid}:${today}`;
    const ex = await kbRead(k) || { total: 0, by: {} };
    ex.total++; ex.by[vector] = (ex.by[vector] || 0) + 1;
    await kbSave(k, ex);
    if (ex.total > 20) audit({ type: 'excessive_cache_breaks', client: this.cid, total: ex.total });
  }
  async report() { return kbRead(`cache:breaks:${this.cid}:${new Date().toISOString().split('T')[0]}`); }
}

module.exports = { CacheTracker, CACHE_BREAK_VECTORS: VECTORS };
