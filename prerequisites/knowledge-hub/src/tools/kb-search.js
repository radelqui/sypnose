import { getDb } from '../db.js';

export function kbSearch({ query, project = null, category = null, limit = 10 }) {
  const db = getDb();

  let sql = `
    SELECT k.id, k.key, k.value, k.category, k.project, k.tier,
           k.access_count, k.last_accessed_at,
           rank
    FROM knowledge_fts f
    JOIN knowledge k ON k.id = f.rowid
    WHERE knowledge_fts MATCH ?
  `;
  const params = [query];

  if (project) { sql += ' AND k.project = ?'; params.push(project); }
  if (category) { sql += ' AND k.category = ?'; params.push(category); }

  sql += ' ORDER BY rank LIMIT ?';
  params.push(limit);

  const results = db.prepare(sql).all(...params);

  // Increment access_count and promote WARM->HOT if accessed enough
  const updateAccess = db.prepare(`
    UPDATE knowledge SET
      access_count = access_count + 1,
      last_accessed_at = datetime('now'),
      tier = CASE WHEN tier = 'WARM' AND access_count + 1 > 5 THEN 'HOT' ELSE tier END
    WHERE id = ?
  `);

  for (const r of results) {
    updateAccess.run(r.id);
  }

  return { results, count: results.length };
}
