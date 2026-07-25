DROP TABLE IF EXISTS installments;

CREATE TABLE IF NOT EXISTS installments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount REAL NOT NULL,
  monthly_amount REAL NOT NULL,
  total_months INTEGER NOT NULL,
  remaining_months INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_installments_user_id ON installments(user_id);
