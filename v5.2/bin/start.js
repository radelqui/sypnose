'use strict';
const { CoordinatorLoop } = require('../core/loop');
const config = require('/opt/sypnose/config/clients.json');
const coord = new CoordinatorLoop(config);
process.on('SIGTERM', () => coord.stop());
process.on('SIGINT', () => coord.stop());
(async () => {
  for await (const t of coord.run()) {
    if (t.phase !== 'sleep') console.log(`[Y${t.y}] ${t.phase}`, JSON.stringify(t));
  }
})().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
