import { getDb, closeDb } from '../src/db.js';
import { kbPrune } from '../src/tools/index.js';

const timestamp = new Date().toISOString();
console.log(`[${timestamp}] KnowledgeHub: Running tier degradation...`);

try {
  const db = getDb();

  // Get pre-prune stats
  const before = db.prepare(`
    SELECT tier, COUNT(*) as count FROM knowledge GROUP BY tier
  `).all();
  console.log('Before:', JSON.stringify(before));

  // Run prune
  const result = kbPrune({ dryRun: false });

  console.log(`HOT→WARM: ${result.hotToWarm.count} entries`);
  if (result.hotToWarm.count > 0) {
    console.log('  Keys:', result.hotToWarm.entries.join(', '));
  }

  console.log(`WARM→COLD: ${result.warmToCold.count} entries`);
  if (result.warmToCold.count > 0) {
    console.log('  Keys:', result.warmToCold.entries.join(', '));
  }

  // Get post-prune stats
  const after = db.prepare(`
    SELECT tier, COUNT(*) as count FROM knowledge GROUP BY tier
  `).all();
  console.log('After:', JSON.stringify(after));

  closeDb();
  console.log(`[${timestamp}] Degradation complete.`);
} catch (err) {
  console.error(`[${timestamp}] Degradation failed:`, err);
  closeDb();
  process.exit(1);
}
