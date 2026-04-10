import { db } from '../db/database.js'

interface SettingsRow {
  key: string
  value: string
}

export function getSettingInt(key: string, fallback: number): number {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as SettingsRow | undefined
  if (!row) return fallback
  const n = parseInt(row.value, 10)
  return isNaN(n) ? fallback : n
}

export function getSettingString(key: string, fallback: string): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as SettingsRow | undefined
  return row?.value ?? fallback
}

export function getSettingJson<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as SettingsRow | undefined
  if (!row) return fallback
  try {
    return JSON.parse(row.value) as T
  } catch {
    return fallback
  }
}
