import { db } from '../db/database.js'

interface AdminRow {
  username: string
  created_at: string
  last_login: string | null
}

export function isFirstRun(): boolean {
  const admin = db.prepare('SELECT id FROM admin WHERE id = 1').get()
  return !admin
}

export function getAdminInfo(): { username: string; createdAt: string; lastLogin?: string } | null {
  const admin = db
    .prepare('SELECT username, created_at, last_login FROM admin WHERE id = 1')
    .get() as AdminRow | undefined

  if (!admin) return null

  return {
    username: admin.username,
    createdAt: admin.created_at,
    lastLogin: admin.last_login ?? undefined,
  }
}
