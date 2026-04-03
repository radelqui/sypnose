import { getDb } from '../db.js';
import { handleNotification } from '../inbox.js';

export function kbSave({ key, value, category = 'general', project = null }) {
  const db = getDb();

  // Enforce max 500 HOT entries per project
  const hotCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM knowledge WHERE tier = ? AND project IS ?'
  ).get('HOT', project);

  if (hotCount.cnt >= 500) {
    // Degrade oldest HOT to WARM
    db.prepare(`
      UPDATE knowledge SET tier = 'WARM', updated_at = datetime('now')
      WHERE id IN (
        SELECT id FROM knowledge
        WHERE tier = 'HOT' AND project IS ?
        ORDER BY last_accessed_at ASC LIMIT 1
      )
    `).run(project);
  }

  // FIX: SQLite treats NULL != NULL in UNIQUE indexes, so ON CONFLICT(key, project)
  // never fires when project IS NULL. Use explicit find + update/insert instead.
  const existing = db.prepare(
    'SELECT id FROM knowledge WHERE key = ? AND project IS ?'
  ).get(key, project);

  let result;
  if (existing) {
    result = db.prepare(`
      UPDATE knowledge SET
        value = ?,
        category = ?,
        tier = 'HOT',
        access_count = access_count + 1,
        updated_at = datetime('now'),
        last_accessed_at = datetime('now')
      WHERE id = ?
    `).run(value, category, existing.id);
    result.lastInsertRowid = existing.id;
  } else {
    result = db.prepare(`
      INSERT INTO knowledge (key, value, category, project, tier)
      VALUES (?, ?, ?, ?, 'HOT')
    `).run(key, value, category, project);
  }

  // Trigger inbox + Telegram webhook for notifications
  if (category === 'notification') {
    // Non-blocking — errors caught inside handleNotification
    try {
      handleNotification({ key, value, project, sender: project || 'system' });
    } catch (err) {
      console.error('[kb-save] handleNotification error:', err.message);
    }
  }

  return { success: true, id: result.lastInsertRowid, key, category, project };
}
