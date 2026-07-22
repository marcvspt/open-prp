CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
