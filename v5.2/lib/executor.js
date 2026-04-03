'use strict';
const { execSync } = require('child_process');
const { tmuxSend, tmuxCapture, tmuxAlive, classifyTimeout } = require('../core/loop');

const EXECUTORS = {
  tmux: {
    execute: (session, cmd) => { if (!tmuxAlive(session)) throw new Error(`session_dead: ${session}`); return tmuxSend(session, cmd); },
    capture: (session, lines) => tmuxCapture(session, lines),
    alive: (session) => tmuxAlive(session)
  },
  local: {
    execute: (_session, cmd) => execSync(cmd, { timeout: classifyTimeout(cmd), encoding: 'utf-8' }),
    capture: () => null,
    alive: () => true
  }
};

class Executor {
  constructor(type = 'tmux', config = {}) {
    if (!EXECUTORS[type]) throw new Error(`Unknown executor: ${type}`);
    this.type = type; this.backend = EXECUTORS[type]; this.session = config.session || null;
  }
  run(cmd) { return this.type === 'tmux' ? this.backend.execute(this.session, cmd) : this.backend.execute(null, cmd); }
  capture(lines = 20) { return this.backend.capture(this.session, lines); }
  alive() { return this.backend.alive(this.session); }
}

module.exports = { Executor, EXECUTORS };
