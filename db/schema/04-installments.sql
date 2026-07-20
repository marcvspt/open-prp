CREATE TABLE IF NOT EXISTS installments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES credit_cards(id) ON DELETE SET NULL,
  family_id TEXT REFERENCES families(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  total_amount REAL NOT NULL,
  monthly_amount REAL NOT NULL,
  total_months INTEGER NOT NULL,
  remaining_months INTEGER NOT NULL,
  start_month TEXT NOT NULL,
  category TEXT,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_installments_user_id ON installments(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_card_id ON installments(card_id);
