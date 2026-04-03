import { getDb, closeDb } from '../src/db.js';

console.log('KnowledgeHub: Running migration...');

try {
  const db = getDb();

  // Check tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t => t.name).join(', '));

  // Check FTS
  const fts = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_fts'").get();
  console.log('FTS5:', fts ? 'OK' : 'MISSING');

  // Show counts
  const counts = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN tier = 'HOT' THEN 1 ELSE 0 END) as hot,
      SUM(CASE WHEN tier = 'WARM' THEN 1 ELSE 0 END) as warm,
      SUM(CASE WHEN tier = 'COLD' THEN 1 ELSE 0 END) as cold
    FROM knowledge
  `).get();
  console.log('Entries:', JSON.stringify(counts));

  // WAL check
  const journal = db.pragma('journal_mode', { simple: true });
  console.log('Journal mode:', journal);

  closeDb();
  console.log('Migration complete.');
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
