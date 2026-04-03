'use strict';
const { kbList } = require('../core/loop');
const { Memory3Layer } = require('../lib/memory');
(async () => {
  const target = process.argv[2];
  let cids;
  if (target) cids = [target]; else { const keys = await kbList('mem:idx:'); cids = keys.map(k => k.replace('mem:idx:', '')); }
  console.log(`[DREAM] Clients: ${cids.join(', ')}`);
  for (const cid of cids) { const m = new Memory3Layer(cid); if (!(await m.shouldDream())) { console.log(`  ${cid}: skip`); continue; } console.log(`  ${cid}: dreaming...`); const r = await m.dream(); console.log(`  ${cid}: ${r.status}`); if (r.log) r.log.forEach(l => console.log(`    ${l}`)); }
  process.exit(0);
})().catch(e => { console.error('[DREAM] FATAL:', e.message); process.exit(1); });
