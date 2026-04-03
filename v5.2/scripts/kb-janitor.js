'use strict';
const { kbList, kbRead, kbDelete, parallelKbRead, audit } = require('../core/loop');
const RET = { 'mailbox:': 7, 'task:': 30, 'mem:tx:': 90, 'cost:': 90, 'compact:': 30, 'recording:': 30, 'ultraplan:': 30, 'context:': 1, 'agent:registered:': 1, 'heartbeat:': 0.01 };
async function clean(prefix, maxDays) {
  const keys = await kbList(prefix); if (!keys.length) return 0;
  const items = await parallelKbRead(keys); let del = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i]; if (!it) continue;
    const ts = it.created_at || it.ts || it.updated_at || it.dispatched_at; if (!ts) continue;
    const age = (Date.now() - new Date(ts).getTime()) / 86400000; if (age < maxDays) continue;
    if (prefix === 'mailbox:' && !it.ack) continue;
    if (prefix === 'task:' && it.status !== 'verified' && it.status !== 'aborted') continue;
    await kbDelete(keys[i]); del++;
  }
  return del;
}
(async () => {
  console.log(`[JANITOR] ${new Date().toISOString()}`);
  let total = 0;
  for (const [p, d] of Object.entries(RET)) { const n = await clean(p, d); if (n) console.log(`  ${p.padEnd(25)}-${n} (>${d}d)`); total += n; }
  console.log(`[JANITOR] Done: ${total} deleted`);
  audit({ type: 'janitor', deleted: total });
  const { Memory3Layer } = require('../lib/memory');
  const idxKeys = await kbList('mem:idx:');
  for (const k of idxKeys) { const cid = k.replace('mem:idx:', ''); const m = new Memory3Layer(cid); if (await m.shouldDream()) { console.log(`  [DREAM] ${cid}...`); const r = await m.dream(); console.log(`  [DREAM] ${cid}: ${r.status}`); } }
  process.exit(0);
})().catch(e => { console.error('[JANITOR] FATAL:', e.message); process.exit(1); });
