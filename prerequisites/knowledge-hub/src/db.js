import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'knowledge.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    // WAL mode for concurrent reads
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000');
    initSchema();
    // Add notified column to a2a_messages if it doesn't exist yet (migration)
    try {
      db.exec('ALTER TABLE a2a_messages ADD COLUMN notified INTEGER NOT NULL DEFAULT 0');
    } catch(e) {
      // Column already exists, ignore
    }
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      project TEXT DEFAULT NULL,
      tier TEXT NOT NULL DEFAULT 'HOT' CHECK(tier IN ('HOT','WARM','COLD')),
      access_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_key_project
      ON knowledge(key, project);
    CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);
    CREATE INDEX IF NOT EXISTS idx_knowledge_project ON knowledge(project);
    CREATE INDEX IF NOT EXISTS idx_knowledge_tier ON knowledge(tier);
    CREATE INDEX IF NOT EXISTS idx_knowledge_accessed ON knowledge(last_accessed_at);

    CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
      key, value, category, project,
      content='knowledge',
      content_rowid='id',
      tokenize='porter unicode61'
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS knowledge_ai AFTER INSERT ON knowledge BEGIN
      INSERT INTO knowledge_fts(rowid, key, value, category, project)
      VALUES (new.id, new.key, new.value, new.category, new.project);
    END;

    CREATE TRIGGER IF NOT EXISTS knowledge_ad AFTER DELETE ON knowledge BEGIN
      INSERT INTO knowledge_fts(knowledge_fts, rowid, key, value, category, project)
      VALUES ('delete', old.id, old.key, old.value, old.category, old.project);
    END;

    CREATE TRIGGER IF NOT EXISTS knowledge_au AFTER UPDATE ON knowledge BEGIN
      INSERT INTO knowledge_fts(knowledge_fts, rowid, key, value, category, project)
      VALUES ('delete', old.id, old.key, old.value, old.category, old.project);
      INSERT INTO knowledge_fts(rowid, key, value, category, project)
      VALUES (new.id, new.key, new.value, new.category, new.project);
    END;

    -- Inbox table for agent-to-agent and system notifications
    CREATE TABLE IF NOT EXISTS inbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      sender TEXT NOT NULL DEFAULT 'system',
      message TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'media' CHECK(priority IN ('alta','media','baja')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inbox_recipient ON inbox(recipient);
    CREATE INDEX IF NOT EXISTS idx_inbox_read_at ON inbox(read_at);
    CREATE INDEX IF NOT EXISTS idx_inbox_created_at ON inbox(created_at);

    -- A2A direct messaging between agents
    CREATE TABLE IF NOT EXISTS a2a_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_agent TEXT NOT NULL,
      to_agent TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'notify' CHECK(type IN ('request','response','notify')),
      payload TEXT NOT NULL,
      reply_to INTEGER DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_a2a_to_agent ON a2a_messages(to_agent);
    CREATE INDEX IF NOT EXISTS idx_a2a_from_agent ON a2a_messages(from_agent);
    CREATE INDEX IF NOT EXISTS idx_a2a_read_at ON a2a_messages(read_at);
    CREATE INDEX IF NOT EXISTS idx_a2a_reply_to ON a2a_messages(reply_to);

    -- MsgHub Channels for broadcast pub/sub
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      project TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS channel_subscribers (
      channel_id INTEGER NOT NULL,
      agent TEXT NOT NULL,
      subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (channel_id, agent),
      FOREIGN KEY (channel_id) REFERENCES channels(id)
    );

    CREATE TABLE IF NOT EXISTS channel_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      from_agent TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (channel_id) REFERENCES channels(id)
    );

    CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel_id);
    CREATE INDEX IF NOT EXISTS idx_channel_messages_created ON channel_messages(created_at);
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
