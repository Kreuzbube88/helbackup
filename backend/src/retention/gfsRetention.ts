import { db } from '../db/database.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { logger } from '../utils/logger.js'
import type { TargetRow } from '../types/rows.js'

const execFileAsync = promisify(execFile)

export interface BackupInfo {
  path: string
  timestamp: Date
  size: number
  manifestId?: number
}

export interface GFSConfig {
  dailyKeep: number
  weeklyKeep: number
  monthlyKeep: number
}

export interface GFSRetentionPlan {
  keep: {
    daily: BackupInfo[]
    weekly: BackupInfo[]
    monthly: BackupInfo[]
  }
  delete: BackupInfo[]
  summary: {
    totalBackups: number
    keepCount: number
    deleteCount: number
    spaceFreed: number
    spaceSaved: number
  }
}

interface ManifestRow {
  id: number
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function calculateGFSRetention(
  backups: BackupInfo[],
  config: GFSConfig
): GFSRetentionPlan {
  const sorted = [...backups].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  const now = new Date()

  // 1. DAILY: keep last N days (one per day, newest wins)
  const dailyCutoff = new Date(now)
  dailyCutoff.setDate(dailyCutoff.getDate() - config.dailyKeep)

  const dailyMap = new Map<string, BackupInfo>()
  for (const backup of sorted) {
    if (backup.timestamp >= dailyCutoff) {
      const key = backup.timestamp.toISOString().split('T')[0]
      if (!dailyMap.has(key)) dailyMap.set(key, backup)
    }
  }

  // 2. WEEKLY: last N weeks (newest backup per ISO week), older than daily window
  const weeklyCutoff = new Date(now)
  weeklyCutoff.setDate(weeklyCutoff.getDate() - config.weeklyKeep * 7)

  const weeklyMap = new Map<string, BackupInfo>()
  for (const backup of sorted) {
    if (backup.timestamp >= weeklyCutoff && backup.timestamp < dailyCutoff) {
      // Use ISO week key — sorted newest-first so first hit per key wins
      const key = `${backup.timestamp.getFullYear()}-W${getWeekNumber(backup.timestamp)}`
      if (!weeklyMap.has(key)) weeklyMap.set(key, backup)
    }
  }

  // 3. MONTHLY: last N months (newest backup per calendar month), older than weekly window
  const monthlyCutoff = new Date(now)
  monthlyCutoff.setMonth(monthlyCutoff.getMonth() - config.monthlyKeep)

  const monthlyMap = new Map<string, BackupInfo>()
  for (const backup of sorted) {
    if (backup.timestamp >= monthlyCutoff && backup.timestamp < weeklyCutoff) {
      // Use 1-based month; sorted newest-first so first hit per key wins
      const key = `${backup.timestamp.getFullYear()}-${backup.timestamp.getMonth() + 1}`
      if (!monthlyMap.has(key)) monthlyMap.set(key, backup)
    }
  }

  const keep = {
    daily: Array.from(dailyMap.values()),
    weekly: Array.from(weeklyMap.values()),
    monthly: Array.from(monthlyMap.values()),
  }

  const keepPaths = new Set<string>([
    ...keep.daily.map(b => b.path),
    ...keep.weekly.map(b => b.path),
    ...keep.monthly.map(b => b.path),
  ])

  const deleteBackups = sorted.filter(b => !keepPaths.has(b.path))
  const spaceFreed = deleteBackups.reduce((sum, b) => sum + b.size, 0)
  const totalSize = sorted.reduce((sum, b) => sum + b.size, 0)

  return {
    keep,
    delete: deleteBackups,
    summary: {
      totalBackups: sorted.length,
      keepCount: keep.daily.length + keep.weekly.length + keep.monthly.length,
      deleteCount: deleteBackups.length,
      spaceFreed,
      spaceSaved: totalSize > 0 ? Math.round((spaceFreed / totalSize) * 100) : 0,
    },
  }
}

async function scanBackups(targetPath: string): Promise<BackupInfo[]> {
  const backups: BackupInfo[] = []
  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const backupPath = path.join(targetPath, entry.name)
      const envelopePath = path.join(backupPath, 'manifest-envelope.json')
      try {
        const envelopeContent = await fs.readFile(envelopePath, 'utf-8')
        const envelope = JSON.parse(envelopeContent) as { backupId?: string; timestamp?: string }
        const { stdout } = await execFileAsync('du', ['-sb', backupPath])
        const size = parseInt(stdout.split('\t')[0]) || 0
        const manifest = db.prepare('SELECT id FROM manifest WHERE backup_id = ?')
          .get(envelope.backupId ?? '') as ManifestRow | undefined
        backups.push({
          path: backupPath,
          timestamp: new Date(envelope.timestamp ?? entry.name),
          size,
          manifestId: manifest?.id,
        })
      } catch {
        // skip directories without valid envelope
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to scan backups in ${targetPath}: ${msg}`)
  }
  return backups
}

export async function executeGFSCleanup(
  targetId: string,
  targetPath: string,
  dryRun: boolean
): Promise<GFSRetentionPlan> {
  logger.info(`GFS cleanup target=${targetId} dry-run=${dryRun}`)

  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(targetId) as TargetRow | undefined
  if (!target) throw new Error(`Target ${targetId} not found`)
  if (target.retention_scheme !== 'gfs') throw new Error('Target is not using GFS retention')

  const config: GFSConfig = {
    dailyKeep: target.gfs_daily_keep || 7,
    weeklyKeep: target.gfs_weekly_keep || 4,
    monthlyKeep: target.gfs_monthly_keep || 12,
  }

  const backups = await scanBackups(targetPath)
  const plan = calculateGFSRetention(backups, config)

  logger.info(
    `GFS plan: keep=${plan.summary.keepCount} delete=${plan.summary.deleteCount} save=${plan.summary.spaceSaved}%`
  )

  if (!dryRun) {
    for (const backup of plan.delete) {
      try {
        await fs.rm(backup.path, { recursive: true, force: true })
        if (backup.manifestId !== undefined) {
          db.prepare('DELETE FROM manifest WHERE id = ?').run(backup.manifestId)
        }
        logger.info(`Deleted backup: ${backup.path}`)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to delete ${backup.path}: ${msg}`)
      }
    }
    logger.info(`GFS cleanup done: ${plan.delete.length} deleted`)
  }

  return plan
}
