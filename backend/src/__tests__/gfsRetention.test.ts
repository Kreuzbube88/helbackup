import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock heavy side-effectful imports before the module loads
vi.mock('../db/database.js', () => ({
  db: { prepare: () => ({ get: () => undefined, run: () => undefined }) },
}))
vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { calculateGFSRetention, type BackupInfo, type GFSConfig } from '../retention/gfsRetention.js'

// Fixed "now": 2025-03-01 12:00:00 UTC
const NOW = new Date('2025-03-01T12:00:00Z')

beforeEach(() => { vi.setSystemTime(NOW) })
afterEach(() => { vi.useRealTimers() })

function backup(daysAgo: number, size = 100_000_000): BackupInfo {
  const ts = new Date(NOW)
  ts.setUTCDate(ts.getUTCDate() - daysAgo)
  ts.setUTCHours(2, 0, 0, 0)
  return { path: `/backups/backup-${daysAgo}d`, timestamp: ts, size }
}

// Generate one backup per day for N days
function dailyBackups(days: number): BackupInfo[] {
  return Array.from({ length: days }, (_, i) => backup(i + 1))
}

const defaultConfig: GFSConfig = { dailyKeep: 7, weeklyKeep: 4, monthlyKeep: 3 }

// ─── Basic structure ─────────────────────────────────────────────────────────

describe('calculateGFSRetention', () => {
  it('returns empty plan for no backups', () => {
    const plan = calculateGFSRetention([], defaultConfig)
    expect(plan.summary.totalBackups).toBe(0)
    expect(plan.summary.keepCount).toBe(0)
    expect(plan.summary.deleteCount).toBe(0)
    expect(plan.delete).toHaveLength(0)
  })

  it('keeps a single recent backup in daily tier', () => {
    const plan = calculateGFSRetention([backup(1)], defaultConfig)
    expect(plan.keep.daily).toHaveLength(1)
    expect(plan.keep.weekly).toHaveLength(0)
    expect(plan.keep.monthly).toHaveLength(0)
    expect(plan.delete).toHaveLength(0)
  })

  // ─── Daily tier ────────────────────────────────────────────────────────────

  describe('daily tier', () => {
    it('keeps at most one backup per day within dailyKeep window', () => {
      // 3 backups in the last 2 days (same day duplicates)
      const b1 = backup(1)
      const b2 = { ...backup(1), path: '/backups/dup-1a' }  // same day, different path
      const b3 = backup(2)
      const plan = calculateGFSRetention([b1, b2, b3], defaultConfig)
      // Only 2 unique days, so 2 daily keeps
      expect(plan.keep.daily).toHaveLength(2)
    })

    it('keeps newest backup when duplicates exist on the same day', () => {
      const older = { path: '/backups/older', timestamp: new Date('2025-02-28T01:00:00Z'), size: 100 }
      const newer = { path: '/backups/newer', timestamp: new Date('2025-02-28T09:00:00Z'), size: 100 }
      const plan = calculateGFSRetention([older, newer], defaultConfig)
      const keptPaths = plan.keep.daily.map(b => b.path)
      expect(keptPaths).toContain('/backups/newer')
      expect(keptPaths).not.toContain('/backups/older')
    })

    it('does not keep backups older than dailyKeep days in daily tier', () => {
      const old = backup(10) // older than 7-day window
      const recent = backup(3)
      const plan = calculateGFSRetention([old, recent], defaultConfig)
      const dailyPaths = plan.keep.daily.map(b => b.path)
      expect(dailyPaths).not.toContain(old.path)
      expect(dailyPaths).toContain(recent.path)
    })
  })

  // ─── Weekly tier ───────────────────────────────────────────────────────────

  describe('weekly tier', () => {
    it('keeps one backup per ISO week in weekly window', () => {
      // 4 weeks of daily backups (days 8-35)
      const backups = Array.from({ length: 28 }, (_, i) => backup(8 + i))
      const plan = calculateGFSRetention(backups, defaultConfig)
      // Each backup is in a different ISO week in the 4-week window → at most 4 weekly keeps
      expect(plan.keep.weekly.length).toBeGreaterThan(0)
      expect(plan.keep.weekly.length).toBeLessThanOrEqual(4)
    })

    it('backups in daily window are not double-counted in weekly tier', () => {
      const backups = dailyBackups(10)
      const plan = calculateGFSRetention(backups, defaultConfig)
      const dailyPaths = new Set(plan.keep.daily.map(b => b.path))
      for (const w of plan.keep.weekly) {
        expect(dailyPaths.has(w.path)).toBe(false)
      }
    })
  })

  // ─── Monthly tier ──────────────────────────────────────────────────────────

  describe('monthly tier', () => {
    it('keeps one backup per calendar month in monthly window', () => {
      // Create backups spanning 3 months ago (outside weekly window)
      const weeklyCutoffDays = defaultConfig.weeklyKeep * 7 + 1 // ~29 days
      const b1 = backup(weeklyCutoffDays + 1)   // 1 month ago
      const b2 = backup(weeklyCutoffDays + 32)  // 2 months ago
      const b3 = backup(weeklyCutoffDays + 62)  // 3 months ago
      const plan = calculateGFSRetention([b1, b2, b3], defaultConfig)
      expect(plan.keep.monthly.length).toBeGreaterThan(0)
    })

    it('backups outside monthly window are marked for deletion', () => {
      const veryOld = backup(500) // ~16 months ago, outside 3-month window
      const plan = calculateGFSRetention([veryOld], defaultConfig)
      expect(plan.delete).toContainEqual(expect.objectContaining({ path: veryOld.path }))
    })
  })

  // ─── Summary calculations ──────────────────────────────────────────────────

  describe('summary', () => {
    it('totalBackups equals input length', () => {
      const backups = dailyBackups(20)
      const plan = calculateGFSRetention(backups, defaultConfig)
      expect(plan.summary.totalBackups).toBe(20)
    })

    it('keepCount + deleteCount equals totalBackups', () => {
      const backups = dailyBackups(60)
      const plan = calculateGFSRetention(backups, defaultConfig)
      expect(plan.summary.keepCount + plan.summary.deleteCount).toBe(plan.summary.totalBackups)
    })

    it('spaceFreed equals sum of deleted backup sizes', () => {
      const backups = dailyBackups(60)
      const plan = calculateGFSRetention(backups, defaultConfig)
      const expected = plan.delete.reduce((s, b) => s + b.size, 0)
      expect(plan.summary.spaceFreed).toBe(expected)
    })

    it('spaceSaved is 0 when nothing is deleted', () => {
      const plan = calculateGFSRetention([backup(1)], defaultConfig)
      expect(plan.summary.spaceSaved).toBe(0)
    })

    it('spaceSaved is 100 when everything is deleted', () => {
      // A backup outside all windows gets fully deleted
      const veryOld = backup(500)
      const plan = calculateGFSRetention([veryOld], defaultConfig)
      expect(plan.summary.spaceSaved).toBe(100)
    })
  })

  // ─── GFS config variations ─────────────────────────────────────────────────

  describe('config variations', () => {
    it('respects dailyKeep=1 (only keeps today)', () => {
      // backup(0) = today at 02:00, well within a 1-day window from noon
      const backups = [backup(0), backup(2), backup(5)]
      const plan = calculateGFSRetention(backups, { dailyKeep: 1, weeklyKeep: 0, monthlyKeep: 0 })
      expect(plan.keep.daily).toHaveLength(1)
      expect(plan.keep.daily[0].path).toBe(backup(0).path)
    })

    it('respects weeklyKeep=0 (no weekly tier)', () => {
      const backups = dailyBackups(30)
      const plan = calculateGFSRetention(backups, { dailyKeep: 7, weeklyKeep: 0, monthlyKeep: 0 })
      expect(plan.keep.weekly).toHaveLength(0)
    })

    it('does not keep duplicates across tiers (no path in multiple tiers)', () => {
      const backups = dailyBackups(90)
      const plan = calculateGFSRetention(backups, defaultConfig)
      const allKept = [
        ...plan.keep.daily,
        ...plan.keep.weekly,
        ...plan.keep.monthly,
      ].map(b => b.path)
      const uniqueKept = new Set(allKept)
      expect(allKept.length).toBe(uniqueKept.size)
    })
  })
})
