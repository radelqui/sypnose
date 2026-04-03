'use strict';
const crypto = require('crypto');
const { audit } = require('../core/loop');

const TAINT = {
  TRUSTED: 0, USER_TYPED: 1, CLAUDE_MD: 2, MCP_RESULT: 3,
  TOOL_DATA: 4, FILE_READ: 5, WEBHOOK: 6, DERIVED: 7,
};

class TaintEngine {
  static tag(content, source, level) {
    return {
      content,
      _taint: {
        source, level, ingested_at: new Date().toISOString(),
        hash: crypto.createHash('sha256').update(typeof content === 'string' ? content : JSON.stringify(content)).digest('hex').slice(0, 12)
      }
    };
  }

  static isInstructionSafe(item) {
    if (!item?._taint) return true;
    return item._taint.level <= TAINT.USER_TYPED;
  }

  static propagate(inputs) {
    let maxLevel = TAINT.TRUSTED;
    for (const input of inputs) { if (input?._taint?.level > maxLevel) maxLevel = input._taint.level; }
    return maxLevel >= TAINT.TOOL_DATA ? TAINT.DERIVED : TAINT.TRUSTED;
  }

  static tagMessage(msg) {
    if (msg._taint) return msg;
    switch (msg._origin || msg.role) {
      case 'user_typed': case 'user': return this.tag(msg.content, 'user', TAINT.USER_TYPED);
      case 'system': return this.tag(msg.content, 'system', TAINT.TRUSTED);
      case 'tool_result': case 'tool': return this.tag(msg.content, 'tool', TAINT.TOOL_DATA);
      case 'file_read': return this.tag(msg.content, 'file', TAINT.FILE_READ);
      case 'mcp_result': return this.tag(msg.content, 'mcp', TAINT.MCP_RESULT);
      case 'claude_md': return this.tag(msg.content, 'claude_md', TAINT.CLAUDE_MD);
      default: return this.tag(msg.content, 'unknown', TAINT.TOOL_DATA);
    }
  }

  static auditCompaction(messages) {
    const tainted = messages.filter(m => m._taint && m._taint.level >= TAINT.TOOL_DATA);
    const instructionLike = tainted.filter(m => {
      const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return /ignore|override|system.*prompt|you\s+are\s+now/i.test(c);
    });
    if (instructionLike.length > 0) {
      audit({ type: 'taint_laundering_attempt', count: instructionLike.length, sources: instructionLike.map(m => m._taint.source) });
    }
    return instructionLike.length;
  }
}

module.exports = { TaintEngine, TAINT };
