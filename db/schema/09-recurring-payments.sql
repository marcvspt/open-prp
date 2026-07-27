DROP TABLE IF EXISTS recurring_payment_monthly;
DROP TABLE IF EXISTS recurring_payments;

CREATE TABLE IF NOT EXISTS recurring_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  type TEXT NOT NULL DEFAULT 'expense' CHECK(type IN ('income','expense')),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recurring_payments_user_id ON recurring_payments(user_id);

CREATE TABLE IF NOT EXISTS recurring_payment_monthly (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES recurring_payments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK(type IN ('income','expense')),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_paid INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(payment_id, month)
);

CREATE INDEX IF NOT EXISTS idx_rp_monthly_month ON recurring_payment_monthly(month);
CREATE INDEX IF NOT EXISTS idx_rp_monthly_user_id ON recurring_payment_monthly(user_id);
