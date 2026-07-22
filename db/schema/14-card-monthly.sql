CREATE TABLE IF NOT EXISTS card_monthly (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  statement_balance REAL NOT NULL DEFAULT 0,
  is_paid INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(card_id, month)
);

CREATE INDEX IF NOT EXISTS idx_card_monthly_card_id ON card_monthly(card_id);
CREATE INDEX IF NOT EXISTS idx_card_monthly_user_id ON card_monthly(user_id);
CREATE INDEX IF NOT EXISTS idx_card_monthly_month ON card_monthly(month);
