PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS targets (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('synology', 'rclone', 'local')),
  config     TEXT NOT NULL DEFAULT '{}',
  enabled    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  schedule   TEXT,
  steps      TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_history (
  id         TEXT PRIMARY KEY,
  job_id     TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'cancelled')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at   TEXT,
  duration_s INTEGER
);

CREATE TABLE IF NOT EXISTS logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id     TEXT NOT NULL REFERENCES job_history(id) ON DELETE CASCADE,
  step_id    TEXT,
  sequence   INTEGER,
  level      TEXT NOT NULL DEFAULT 'info',
  category   TEXT NOT NULL DEFAULT 'system' CHECK(category IN ('system', 'file', 'container', 'network', 'verification')),
  message    TEXT NOT NULL,
  metadata   TEXT,
  ts         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS log_summary (
  id                TEXT PRIMARY KEY,
  run_id            TEXT NOT NULL REFERENCES job_history(id) ON DELETE CASCADE,
  files_copied      INTEGER DEFAULT 0,
  files_skipped     INTEGER DEFAULT 0,
  files_failed      INTEGER DEFAULT 0,
  bytes_transferred INTEGER DEFAULT 0,
  errors            INTEGER DEFAULT 0,
  warnings          INTEGER DEFAULT 0,
  duration_ms       INTEGER,
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Single admin (only 1 row, enforced by CHECK constraint)
CREATE TABLE IF NOT EXISTS admin (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),
  username           TEXT NOT NULL,
  password_hash      TEXT NOT NULL,
  recovery_key_hash  TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  last_login         TEXT
);

CREATE TABLE IF NOT EXISTS restore_sessions (
  session_id    TEXT PRIMARY KEY,
  backup_id     TEXT NOT NULL,
  allowed_paths TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  active        INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT NOT NULL,
  session_id    TEXT,
  operation     TEXT NOT NULL,
  source_path   TEXT,
  target_path   TEXT NOT NULL,
  success       INTEGER DEFAULT 1,
  error_message TEXT,
  bytes_written INTEGER
);

-- Encryption configuration (single row, like admin)
CREATE TABLE IF NOT EXISTS encryption_config (
  id                       INTEGER PRIMARY KEY CHECK (id = 1),
  encryption_password_hash TEXT NOT NULL,
  recovery_key_hash        TEXT NOT NULL,
  master_key_salt          TEXT NOT NULL,
  created_at               TEXT NOT NULL,
  last_password_change     TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON restore_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);

CREATE TABLE IF NOT EXISTS manifest (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_id  TEXT NOT NULL UNIQUE,
  job_id     TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  manifest   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_run_id ON logs(run_id);
CREATE INDEX IF NOT EXISTS idx_logs_run_sequence ON logs(run_id, sequence);
CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_job_history_job_id ON job_history(job_id);
CREATE INDEX IF NOT EXISTS idx_manifest_backup_id ON manifest(backup_id);
