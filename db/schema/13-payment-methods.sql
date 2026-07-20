CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_global INTEGER NOT NULL DEFAULT 0,
  scope TEXT CHECK(scope IN ('personal','family','both')),
  family_id TEXT REFERENCES families(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES credit_cards(id) ON DELETE CASCADE,
  icon TEXT,
  color TEXT,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_card_id ON payment_methods(card_id);
