'use strict';
const cmds = new Map();
function reg(n, h, d) { cmds.set(n, { handler: h, desc: d }); }

reg('status', async c => (require('../core/loop')).healthCheck(), 'Estado del sistema');
reg('compact', async (c, a) => { const { tmuxSend, tmuxAlive } = require('../core/loop'); const cl = c.clients.find(x => x.id === a.client_id); if (cl && tmuxAlive(cl.tmux_session)) { tmuxSend(cl.tmux_session, '/compact'); return `ok:${cl.id}`; } return 'not found'; }, 'Forzar compact');
reg('dream', async (c, a) => new (require('./memory').Memory3Layer)(a.client_id || c.clients[0]?.id).dream(), 'autoDream manual');
reg('budget', async c => { const { kbRead } = require('../core/loop'); const d = new Date().toISOString().split('T')[0]; const r = {}; for (const cl of c.clients) r[cl.id] = await kbRead(`cost:${cl.id}:${d}`); return r; }, 'Costos del dia');
reg('pause', async (c, a) => { require('../core/loop').tmuxSend(c.clients.find(x => x.id === a.client_id)?.tmux_session, '/stop'); return `paused ${a.client_id}`; }, 'Pausar');
reg('resume', async (c, a) => { await c.restartAgent(a.client_id); return 'resumed'; }, 'Reanudar');
reg('tools', async (c, a) => require('./tool-registry').registry.forClient(a.industry || '*').map(t => ({ name: t.name, calls: t.calls })), 'Tools');
reg('reliability', async c => { const { kbRead } = require('../core/loop'); const r = {}; for (const cl of c.clients) r[cl.id] = await kbRead(`reliability:${cl.id}`); return r; }, 'Reliability');
reg('planmode', async (c, a) => { const { tmuxSend, tmuxAlive } = require('../core/loop'); const cl = c.clients.find(x => x.id === a.client_id); if (!cl || !tmuxAlive(cl.tmux_session)) return 'not available'; tmuxSend(cl.tmux_session, a.action === 'enter' ? 'PLAN MODE: analiza, NO ejecutes' : 'Saliste de PLAN MODE'); return `${a.action} ${cl.id}`; }, 'Plan mode');
reg('abort', async (c, a) => { const { kbRead, kbSave, tmuxSend, tmuxAlive, audit } = require('../core/loop'); const t = await kbRead(`task:${a.client_id}:${a.task_id}`); if (t) { t.status = 'aborted'; t.aborted_at = new Date().toISOString(); await kbSave(`task:${a.client_id}:${a.task_id}`, t); const cl = c.clients.find(x => x.id === a.client_id); if (cl && tmuxAlive(cl.tmux_session)) tmuxSend(cl.tmux_session, `ABORT ${a.task_id}`); audit({ type: 'task_aborted', task: a.task_id }); } return 'aborted'; }, 'Abortar tarea');
reg('help', async () => [...cmds.entries()].map(([n, c]) => ({ cmd: `/${n}`, desc: c.desc })), 'Ayuda');

async function executeCommand(n, coord, args = {}) { const cmd = cmds.get(n.replace('/', '')); if (!cmd) return { error: `Unknown: ${n}` }; try { return { command: n, result: await cmd.handler(coord, args) }; } catch (e) { return { command: n, error: e.message }; } }

module.exports = { registerCommand: reg, executeCommand, commands: cmds };
