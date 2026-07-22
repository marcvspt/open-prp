DROP TABLE IF EXISTS shopping_items;

CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  notes TEXT,
  is_checked INTEGER NOT NULL DEFAULT 0,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  category TEXT,
  despensa_item_id TEXT REFERENCES pantry_items(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_user_id ON shopping_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_event_id ON shopping_items(event_id);
