import { getDb } from '../db.js';

export function kbContext({ project = null, category = null, limit = 20 }) {
  const db = getDb();

  let sql = `
    SELECT id, key, value, category, project, tier, access_count
    FROM knowledge
    WHERE tier = 'HOT'
  `;
  const params = [];

  if (project) { sql += ' AND project = ?'; params.push(project); }
  if (category) { sql += ' AND category = ?'; params.push(category); }

  sql += ' ORDER BY access_count DESC, last_accessed_at DESC LIMIT ?';
  params.push(limit);

  const entries = db.prepare(sql).all(...params);

  // Format as markdown
  let markdown = `# Knowledge Context${project ? ` — ${project}` : ''}\n\n`;
  for (const e of entries) {
    markdown += `## ${e.key}\n`;
    markdown += `**Category:** ${e.category} | **Tier:** ${e.tier} | **Accesses:** ${e.access_count}\n\n`;
    markdown += `${e.value}\n\n---\n\n`;
  }

  // Update access timestamps
  const updateAccess = db.prepare(`
    UPDATE knowledge SET last_accessed_at = datetime('now') WHERE id = ?
  `);

  for (const e of entries) {
    updateAccess.run(e.id);
  }

  return { markdown, count: entries.length };
}
