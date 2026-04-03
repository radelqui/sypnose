'use strict';
const readline = require('readline');
const { kbSave, kbRead, kbList } = require('../core/loop');
const rl = readline.createInterface({ input: process.stdin });
function send(o) { process.stdout.write(JSON.stringify(o) + '\n'); }

const BLOCKED = ['mem:dream-lock:', 'reliability:', 'cost:', 'compact:'];
const ALLOWED = ['task:', 'mailbox:', 'mem:topic:'];
function validate(key, op) {
  if (op === 'read') { if (key.includes('.env') || key.includes('secret')) return { allowed: false }; return { allowed: true }; }
  for (const p of BLOCKED) if (key.startsWith(p)) return { allowed: false };
  return { allowed: true };
}

const TOOLS = {
  kb_save: { description: 'Save to KB', inputSchema: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'] } },
  kb_read: { description: 'Read from KB', inputSchema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] } },
  kb_list: { description: 'List KB keys by prefix', inputSchema: { type: 'object', properties: { prefix: { type: 'string' } }, required: ['prefix'] } },
  send_task: { description: 'Dispatch task to agent', inputSchema: { type: 'object', properties: { client_id: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' } }, required: ['client_id', 'description'] } },
  get_status: { description: 'Get system status', inputSchema: { type: 'object', properties: {} } }
};

async function handle(name, args) {
  switch (name) {
    case 'kb_save': { const v = validate(args.key, 'write'); if (!v.allowed) return { error: 'namespace blocked' }; await kbSave(args.key, args.value); return { saved: true }; }
    case 'kb_read': { const v = validate(args.key, 'read'); if (!v.allowed) return { error: 'blocked' }; return { value: await kbRead(args.key) }; }
    case 'kb_list': return { keys: await kbList(args.prefix || '') };
    case 'send_task': { const k = `mailbox:coordinator:${Date.now()}-mcp`; await kbSave(k, { id: k, from: 'mcp', to: 'coordinator', type: 'task_dispatch', payload: { client_id: args.client_id, description: args.description, is_plan: false, source: 'mcp' }, priority: args.priority || 'normal', created_at: new Date().toISOString(), claimed_by: null, ack: false, version: 0 }); return { dispatched: true }; }
    case 'get_status': return { tasks: (await kbList('task:')).length, mailbox: (await kbList('mailbox:')).length, kb: true };
  }
}

rl.on('line', async l => {
  let m; try { m = JSON.parse(l); } catch { return; }
  if (m.method === 'initialize') send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'sypnose', version: '5.2.0' } } });
  else if (m.method === 'tools/list') send({ jsonrpc: '2.0', id: m.id, result: { tools: Object.entries(TOOLS).map(([n, d]) => ({ name: n, ...d })) } });
  else if (m.method === 'tools/call') { try { const r = await handle(m.params.name, m.params.arguments); send({ jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] } }); } catch (e) { send({ jsonrpc: '2.0', id: m.id, error: { code: -32603, message: e.message } }); } }
  else if (m.method === 'notifications/initialized') {}
});
