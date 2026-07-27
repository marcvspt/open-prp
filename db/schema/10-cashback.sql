DROP TABLE IF EXISTS cashback;

CREATE TABLE IF NOT EXISTS cashback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES cards(id) ON DELETE SET NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  description TEXT,
  date TEXT NOT NULL,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cashback_user_id ON cashback(user_id);
CREATE INDEX IF NOT EXISTS idx_cashback_card_id ON cashback(card_id);
