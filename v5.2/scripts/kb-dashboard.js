'use strict';
const { kbList, kbRead, parallelKbRead } = require('../core/loop');
(async () => {
  console.log('=== SYPNOSE KB DASHBOARD ===\n');
  const ns = [
    { prefix: 'mailbox:', name: 'Mailbox', ret: '7d' },
    { prefix: 'task:', name: 'Tasks', ret: '30d' },
    { prefix: 'mem:idx:', name: 'Memory Index', ret: 'perm' },
    { prefix: 'mem:topic:', name: 'Memory Topics', ret: 'perm' },
    { prefix: 'mem:tx:', name: 'Transcripts', ret: '90d' },
    { prefix: 'cost:', name: 'Cost Tracking', ret: '90d' },
    { prefix: 'reliability:', name: 'Reliability', ret: 'perm' },
    { prefix: 'heartbeat:', name: 'Heartbeats', ret: '5m' },
    { prefix: 'policies:', name: 'Policies', ret: 'perm' },
    { prefix: 'telemetry:', name: 'Telemetry', ret: '30d' },
    { prefix: 'flags:', name: 'Client Flags', ret: 'perm' },
    { prefix: 'compact:', name: 'MicroCompact', ret: '30d' },
    { prefix: 'recording:', name: 'Recordings', ret: '30d' },
  ];
  let total = 0;
  for (const n of ns) { const keys = await kbList(n.prefix); total += keys.length; console.log(`  ${n.name.padEnd(20)} ${String(keys.length).padStart(5)} keys  [${n.ret}]`); }
  console.log(`\n  ${'TOTAL'.padEnd(20)} ${String(total).padStart(5)} keys`);
  process.exit(0);
})().catch(console.error);
