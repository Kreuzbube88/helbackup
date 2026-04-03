import bcrypt from 'bcryptjs'
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
  logger.info({ path: DB_PATH }, 'Database initialized')

  // Create admin user if ADMIN_PASSWORD is set and no users exist
  const adminPassword = process.env.ADMIN_PASSWORD
  if (adminPassword) {
    const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
    if (existingUsers.count === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 12)
      db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', passwordHash)
      logger.info('Admin user created')
    }
  }

  return db
}

export const db = await initDb()
