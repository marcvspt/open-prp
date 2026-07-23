DROP TABLE IF EXISTS pantry_items;
DROP TABLE IF EXISTS inventory_categories;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS pantry_categories;

CREATE TABLE IF NOT EXISTS pantry_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  default_quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  notes TEXT,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON pantry_items(user_id);
