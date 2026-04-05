import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DB_PATH = process.env.DB_PATH ?? '/app/data/helbackup.db'

function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

async function initDb(): Promise<Database.Database> {
  ensureDir(DB_PATH)
  const db = new Database(DB_PATH)
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  db.exec(schema)

  // Migrations for columns added after initial release
  for (const sql of [
    "ALTER TABLE logs ADD COLUMN sequence INTEGER",
    "ALTER TABLE logs ADD COLUMN category TEXT NOT NULL DEFAULT 'system'",
    "ALTER TABLE logs ADD COLUMN metadata TEXT",
    // Phase 6.5: advanced job settings
    "ALTER TABLE jobs ADD COLUMN use_database_dumps INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE jobs ADD COLUMN verify_checksums INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE jobs ADD COLUMN retention_days INTEGER",
    "ALTER TABLE jobs ADD COLUMN retention_minimum INTEGER NOT NULL DEFAULT 3",
    "ALTER TABLE jobs ADD COLUMN pre_backup_script TEXT",
    "ALTER TABLE jobs ADD COLUMN post_backup_script TEXT",
    // Phase 6.5: manifest verification tracking
    "ALTER TABLE manifest ADD COLUMN verified INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE manifest ADD COLUMN last_verified TEXT",
    "ALTER TABLE manifest ADD COLUMN verification_passed INTEGER",
    "ALTER TABLE manifest ADD COLUMN verification_failed INTEGER",
    "ALTER TABLE manifest ADD COLUMN verification_missing INTEGER",
    // Language preference
    "ALTER TABLE admin ADD COLUMN language TEXT NOT NULL DEFAULT 'de'",
    // Phase 8.5: encryption support
    "ALTER TABLE jobs ADD COLUMN use_encryption INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE targets ADD COLUMN encryption_method TEXT",
    // Phase 8.5.1: store encrypted password for runtime use
    "ALTER TABLE encryption_config ADD COLUMN encrypted_password TEXT",
    // Phase 9.2: GFS retention
    "ALTER TABLE targets ADD COLUMN retention_scheme TEXT DEFAULT 'simple'",
    "ALTER TABLE targets ADD COLUMN gfs_daily_keep INTEGER DEFAULT 7",
    "ALTER TABLE targets ADD COLUMN gfs_weekly_keep INTEGER DEFAULT 4",
    "ALTER TABLE targets ADD COLUMN gfs_monthly_keep INTEGER DEFAULT 12",
    // Phase 10: API tokens
    `CREATE TABLE IF NOT EXISTS api_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      scopes TEXT NOT NULL,
      expires_at TEXT,
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked INTEGER DEFAULT 0
    )`,
    "CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token)",
    // Phase 10: Webhooks
    `CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      secret TEXT,
      events TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id INTEGER NOT NULL,
      event TEXT NOT NULL,
      payload TEXT NOT NULL,
      response_status INTEGER,
      response_body TEXT,
      attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
      retry_count INTEGER DEFAULT 0,
      FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
    )`,
  ]) {
    try { db.exec(sql) } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // Silently ignore "already exists" errors — safe to retry migrations
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) {
        logger.warn({ sql, err: msg }, 'Migration warning')
      }
    }
  }

  logger.info({ path: DB_PATH }, 'Database initialized')

  // Migrate from legacy users table to admin table if needed
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin').get() as { count: number }
  if (adminCount.count === 0) {
    try {
      const firstUser = db.prepare('SELECT * FROM users LIMIT 1').get() as
        | { username: string; password_hash: string }
        | undefined
      if (firstUser) {
        const { generateRecoveryKey, hashRecoveryKey } = await import('../utils/recoveryKey.js')
        const recoveryKey = generateRecoveryKey()
        const recoveryKeyHash = await hashRecoveryKey(recoveryKey)
        db.prepare(
          'INSERT INTO admin (id, username, password_hash, recovery_key_hash, created_at) VALUES (1, ?, ?, ?, ?)'
        ).run(firstUser.username, firstUser.password_hash, recoveryKeyHash, new Date().toISOString())
        logger.warn('⚠️  MIGRATED existing user to admin table')
        logger.warn(`⚠️  RECOVERY KEY (save this!): ${recoveryKey}`)
      }
    } catch {
      // users table might not have data — first-run setup handles this
    }
  }

  return db
}

export const db = await initDb()
