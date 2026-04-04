CREATE TABLE IF NOT EXISTS notification_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL UNIQUE,
  enabled INTEGER DEFAULT 1,
  config TEXT NOT NULL,
  events TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  event TEXT NOT NULL,
  success INTEGER NOT NULL,
  error_message TEXT,
  sent_at TEXT NOT NULL
);
