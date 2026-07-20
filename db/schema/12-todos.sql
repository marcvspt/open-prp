CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id TEXT REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_event_id ON todos(event_id);
CREATE INDEX IF NOT EXISTS idx_todos_family_id ON todos(family_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
