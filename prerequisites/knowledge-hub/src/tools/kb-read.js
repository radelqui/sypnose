import { getDb } from '../db.js';

export function kbRead({ key, project = null }) {
  const db = getDb();

  const entry = db.prepare(
    'SELECT * FROM knowledge WHERE key = ? AND project IS ?'
  ).get(key, project);

  if (!entry) return { found: false, key, project };

  // Update access
  db.prepare(`
    UPDATE knowledge SET
      access_count = access_count + 1,
      last_accessed_at = datetime('now')
    WHERE id = ?
  `).run(entry.id);

  return { found: true, entry };
}
