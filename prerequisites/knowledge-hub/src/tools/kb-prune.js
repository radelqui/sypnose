import { getDb } from '../db.js';

export function kbPrune({ dryRun = false }) {
  const db = getDb();

  // HOT entries not accessed in 7 days -> WARM
  const hotToWarm = db.prepare(`
    SELECT id, key, project FROM knowledge
    WHERE tier = 'HOT'
    AND last_accessed_at < datetime('now', '-7 days')
  `).all();

  // WARM entries not accessed in 90 days -> COLD
  const warmToCold = db.prepare(`
    SELECT id, key, project FROM knowledge
    WHERE tier = 'WARM'
    AND last_accessed_at < datetime('now', '-90 days')
  `).all();

  if (!dryRun) {
    if (hotToWarm.length > 0) {
      db.prepare(`
        UPDATE knowledge SET tier = 'WARM', updated_at = datetime('now')
        WHERE tier = 'HOT' AND last_accessed_at < datetime('now', '-7 days')
      `).run();
    }

    if (warmToCold.length > 0) {
      db.prepare(`
        UPDATE knowledge SET tier = 'COLD', updated_at = datetime('now')
        WHERE tier = 'WARM' AND last_accessed_at < datetime('now', '-90 days')
      `).run();
    }
  }

  return {
    hotToWarm: { count: hotToWarm.length, entries: hotToWarm.map(e => e.key) },
    warmToCold: { count: warmToCold.length, entries: warmToCold.map(e => e.key) },
    dryRun
  };
}
