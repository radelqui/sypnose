import { getDb } from '../db.js';

export function kbList({ project = null, category = null, tier = null, limit = 50, offset = 0 }) {
  const db = getDb();

  let sql = 'SELECT id, key, category, project, tier, access_count, last_accessed_at FROM knowledge WHERE 1=1';
  const params = [];

  if (project) { sql += ' AND project = ?'; params.push(project); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (tier) { sql += ' AND tier = ?'; params.push(tier); }

  sql += ' ORDER BY last_accessed_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const entries = db.prepare(sql).all(...params);

  const total = db.prepare(
    'SELECT COUNT(*) as cnt FROM knowledge' +
    (project ? ' WHERE project = ?' : '') +
    (category ? (project ? ' AND' : ' WHERE') + ' category = ?' : '') +
    (tier ? ((project || category) ? ' AND' : ' WHERE') + ' tier = ?' : '')
  ).get(...[project, category, tier].filter(Boolean));

  return { entries, total: total.cnt, limit, offset };
}
