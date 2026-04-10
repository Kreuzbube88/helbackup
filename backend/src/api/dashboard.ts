import type { FastifyInstance } from 'fastify'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { db } from '../db/database.js'
import cronParser from 'cron-parser'

const execFileAsync = promisify(execFile)

interface HistoryRow {
  name: string
  status: string
  started_at: string
  ended_at: string | null
}

interface DayStats {
  date: string
  success: number
  failed: number
  total: number
}

interface SuccessStats {
  total: number
  successful: number
  failed: number
}

interface RecentJobRow {
  id: string
  jobName: string
  status: string
  started_at: string
  ended_at: string | null
  duration_s: number | null
}

export function dashboardRoutes(app: FastifyInstance) {
  app.get('/api/dashboard', { preHandler: [app.authenticate] }, async (_request, reply) => {
    try {
      const [systemStatus, backupHistory, successRate, storage, recentJobs, warnings] = await Promise.all([
        getSystemStatus(),
        getBackupHistory(),
        getSuccessRate(),
        getStorageInfo(),
        getRecentJobs(),
        getWarnings(),
      ])

      return reply.send({ systemStatus, backupHistory, successRate, storage, recentJobs, warnings })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: msg })
    }
  })
}

async function getSystemStatus() {
  const lastJob = db.prepare(`
    SELECT j.name, r.status, r.started_at, r.ended_at
    FROM job_history r
    JOIN jobs j ON r.job_id = j.id
    WHERE r.status IN ('success', 'failed')
    ORDER BY r.started_at DESC
    LIMIT 1
  `).get() as HistoryRow | undefined

  const nextJob = db.prepare(`
    SELECT name, schedule FROM jobs
    WHERE enabled = 1 AND schedule IS NOT NULL
    ORDER BY name LIMIT 1
  `).get() as { name: string; schedule: string } | undefined

  let status: 'healthy' | 'warning' | 'critical' = 'healthy'
  let code = 'healthy'

  if (!lastJob) {
    status = 'warning'
    code = 'no_backups_run'
  } else if (lastJob.status === 'failed') {
    status = 'critical'
    code = 'last_failed'
  } else if (lastJob.ended_at) {
    const hoursSince = (Date.now() - new Date(lastJob.ended_at).getTime()) / (1000 * 60 * 60)
    if (hoursSince > 168) {
      status = 'critical'
      code = 'no_backup_7d'
    } else if (hoursSince > 48) {
      status = 'warning'
      code = 'no_backup_48h'
    }
  }

  return {
    status,
    code,
    lastBackup: lastJob && lastJob.ended_at ? {
      timestamp: lastJob.ended_at,
      jobName: lastJob.name,
      status: lastJob.status,
      duration: Math.floor(
        (new Date(lastJob.ended_at).getTime() - new Date(lastJob.started_at).getTime()) / 1000
      ),
    } : null,
    nextScheduled: nextJob ? {
      timestamp: getNextSchedule(nextJob.schedule),
      jobName: nextJob.name,
    } : null,
  }
}

async function getBackupHistory(): Promise<DayStats[]> {
  // Single aggregation query instead of 30 individual queries
  const rows = db.prepare(`
    SELECT
      date(started_at) as date,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      COUNT(*) as total
    FROM job_history
    WHERE started_at >= datetime('now', '-30 days')
    GROUP BY date(started_at)
  `).all() as { date: string; success: number; failed: number; total: number }[]

  const rowMap = new Map(rows.map(r => [r.date, r]))
  const history: DayStats[] = []

  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const row = rowMap.get(dateStr)
    history.push({
      date: dateStr,
      success: row?.success ?? 0,
      failed: row?.failed ?? 0,
      total: row?.total ?? 0,
    })
  }

  return history
}

async function getSuccessRate() {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM job_history
    WHERE started_at >= datetime('now', '-30 days')
  `).get() as SuccessStats

  const percentage = stats.total > 0
    ? Math.round((stats.successful / stats.total) * 100)
    : 0

  return {
    percentage,
    total: stats.total || 0,
    successful: stats.successful || 0,
    failed: stats.failed || 0,
  }
}

async function getStorageInfo() {
  const backupCount = (
    db.prepare('SELECT COUNT(*) as count FROM manifest').get() as { count: number }
  ).count
  const oldest = (
    db.prepare('SELECT MIN(created_at) as oldest FROM manifest').get() as { oldest: string | null }
  ).oldest

  // Sum all backup entry sizes from manifests
  let manifestTotalBytes = 0
  try {
    const rows = db.prepare('SELECT manifest FROM manifest').all() as { manifest: string }[]
    for (const row of rows) {
      try {
        const m = JSON.parse(row.manifest) as { entries?: { size?: number }[] }
        manifestTotalBytes += m.entries?.reduce((s, e) => s + (e.size ?? 0), 0) ?? 0
      } catch { /* skip corrupt manifest */ }
    }
  } catch { /* skip */ }

  // Per-target info
  interface TargetInfo {
    id: string
    name: string
    type: string
    diskTotal: number | null
    diskUsed: number | null
    diskAvailable: number | null
    diskCheckedAt: string | null
  }

  const targets: TargetInfo[] = []
  try {
    const rows = db.prepare('SELECT id, name, type, config FROM targets WHERE enabled = 1').all() as {
      id: string; name: string; type: string; config: string
    }[]

    for (const t of rows) {
      let diskTotal: number | null = null
      let diskUsed: number | null = null
      let diskAvailable: number | null = null
      let diskCheckedAt: string | null = null

      if (t.type === 'nas') {
        const usage = db.prepare(
          'SELECT total_bytes, used_bytes, available_bytes, checked_at FROM target_disk_usage WHERE target_id = ?'
        ).get(t.id) as { total_bytes: number; used_bytes: number; available_bytes: number; checked_at: string } | undefined
        if (usage) {
          diskTotal = usage.total_bytes
          diskUsed = usage.used_bytes
          diskAvailable = usage.available_bytes
          diskCheckedAt = usage.checked_at
        }
      } else if (t.type === 'local') {
        try {
          let cfg: Record<string, unknown> = {}
          try { cfg = JSON.parse(t.config) as Record<string, unknown> } catch { /* default */ }
          const p = cfg['path'] as string | undefined
          if (p) {
            const { stdout: dfOut } = await execFileAsync('df', ['-B1', p]).catch(() => ({ stdout: '' }))
            const parts = (dfOut.split('\n')[1] ?? '').trim().split(/\s+/).filter(Boolean)
            diskTotal = parseInt(parts[1] ?? '0') || 0
            diskUsed = parseInt(parts[2] ?? '0') || 0
            diskAvailable = parseInt(parts[3] ?? '0') || 0
            diskCheckedAt = new Date().toISOString()
          }
        } catch { /* target not accessible */ }
      }

      targets.push({ id: t.id, name: t.name, type: t.type, diskTotal, diskUsed, diskAvailable, diskCheckedAt })
    }
  } catch { /* skip */ }

  return {
    backupCount,
    oldestBackup: oldest,
    manifestTotalBytes,
    targets,
  }
}

async function getRecentJobs() {
  const jobs = db.prepare(`
    SELECT r.id, j.name as jobName, r.status, r.started_at, r.ended_at, r.duration_s
    FROM job_history r
    JOIN jobs j ON r.job_id = j.id
    ORDER BY r.started_at DESC
    LIMIT 10
  `).all() as RecentJobRow[]

  return jobs.map(job => ({
    id: job.id,
    jobName: job.jobName,
    status: job.status,
    startTime: job.started_at,
    endTime: job.ended_at,
    duration: job.duration_s ?? (
      job.ended_at
        ? Math.floor((new Date(job.ended_at).getTime() - new Date(job.started_at).getTime()) / 1000)
        : 0
    ),
    size: 0,
  }))
}

async function getWarnings() {
  const warnings: { type: 'error' | 'warning' | 'info'; code: string; count?: number; actionCode?: string }[] = []

  // Count jobs where the most recent run overall is still failed
  const currentlyFailing = (db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT h.job_id
      FROM job_history h
      INNER JOIN (
        SELECT job_id, MAX(started_at) as max_started
        FROM job_history
        GROUP BY job_id
      ) latest ON h.job_id = latest.job_id AND h.started_at = latest.max_started
      WHERE h.status = 'failed'
    )
  `).get() as { count: number }).count

  if (currentlyFailing > 0) {
    warnings.push({ type: 'error', code: 'current_failures', count: currentlyFailing, actionCode: 'view_logs' })
  }

  const lastSuccess = (db.prepare(`
    SELECT MAX(ended_at) as lastTime FROM job_history WHERE status = 'success'
  `).get() as { lastTime: string | null }).lastTime

  if (lastSuccess) {
    const hoursSince = (Date.now() - new Date(lastSuccess).getTime()) / (1000 * 60 * 60)
    if (hoursSince > 168) {
      warnings.push({ type: 'error', code: 'no_backup_7d', actionCode: 'run_now' })
    } else if (hoursSince > 48) {
      warnings.push({ type: 'warning', code: 'no_backup_48h', actionCode: 'check_schedule' })
    }
  } else {
    warnings.push({ type: 'info', code: 'no_backups_yet', actionCode: 'setup_job' })
  }

  return warnings
}

function getNextSchedule(cronExpression: string): string {
  try {
    const interval = cronParser.parseExpression(cronExpression)
    return interval.next().toDate().toISOString()
  } catch {
    const now = new Date()
    now.setHours(now.getHours() + 1)
    return now.toISOString()
  }
}
