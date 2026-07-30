DROP TABLE IF EXISTS categories;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sections TEXT NOT NULL DEFAULT '["transactions"]',
  type TEXT NOT NULL CHECK(type IN ('global','personal')) DEFAULT 'personal',
  icon TEXT,
  color TEXT,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
