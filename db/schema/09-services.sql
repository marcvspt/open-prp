CREATE TABLE IF NOT EXISTS recurring_services (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id TEXT REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_amount REAL NOT NULL,
  card_id TEXT REFERENCES credit_cards(id) ON DELETE SET NULL,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recurring_services_user_id ON recurring_services(user_id);

CREATE TABLE IF NOT EXISTS service_monthly (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES recurring_services(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  amount REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_paid INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(service_id, month)
);

CREATE INDEX IF NOT EXISTS idx_service_monthly_month ON service_monthly(month);
CREATE INDEX IF NOT EXISTS idx_service_monthly_user_id ON service_monthly(user_id);
