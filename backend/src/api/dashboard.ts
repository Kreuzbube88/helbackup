import type { FastifyInstance } from 'fastify'
import { exec } from 'child_process'
import { promisify } from 'util'
import { db } from '../db/database.js'

const execAsync = promisify(exec)

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
  let message = 'All systems operational'

  if (!lastJob) {
    status = 'warning'
    message = 'No backups have been run yet'
  } else if (lastJob.status === 'failed') {
    status = 'critical'
    message = 'Last backup failed'
  } else if (lastJob.ended_at) {
    const hoursSince = (Date.now() - new Date(lastJob.ended_at).getTime()) / (1000 * 60 * 60)
    if (hoursSince > 168) {
      status = 'critical'
      message = 'No successful backup in over 7 days'
    } else if (hoursSince > 48) {
      status = 'warning'
      message = 'No recent backup (>48h)'
    }
  }

  return {
    status,
    message,
    lastBackup: lastJob && lastJob.ended_at ? {
      timestamp: lastJob.ended_at,
      jobName: lastJob.name,
      status: lastJob.status,
      duration: Math.floor(
        (new Date(lastJob.ended_at).getTime() - new Date(lastJob.started_at).getTime()) / 1000
      ),
    } : null,
    nextScheduled: nextJob ? {
      timestamp: getNextScheduleApprox(),
      jobName: nextJob.name,
    } : null,
  }
}

async function getBackupHistory(): Promise<DayStats[]> {
  const history: DayStats[] = []

  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const jobs = db.prepare(`
      SELECT status FROM job_history
      WHERE started_at >= ? AND started_at < ?
    `).all(date.toISOString(), nextDate.toISOString()) as { status: string }[]

    history.push({
      date: date.toISOString().split('T')[0],
      success: jobs.filter(j => j.status === 'success').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      total: jobs.length,
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

  let totalUsed = 0
  let totalAvailable = 0

  try {
    const targets = db.prepare(
      `SELECT config, type FROM targets WHERE enabled = 1`
    ).all() as { config: string; type: string }[]

    for (const t of targets) {
      if (t.type !== 'local') continue
      let cfg: Record<string, unknown>
      try { cfg = JSON.parse(t.config) } catch { continue }
      const p = cfg['path'] as string | undefined
      if (!p) continue

      try {
        const { stdout: duOut } = await execAsync(`du -sb "${p}" 2>/dev/null || echo "0\t."`)
        totalUsed += parseInt(duOut.split('\t')[0]) || 0

        const { stdout: dfOut } = await execAsync(`df -B1 "${p}" | tail -1`)
        totalAvailable += parseInt(dfOut.split(/\s+/)[3]) || 0
      } catch { /* target not accessible */ }
    }
  } catch { /* skip storage calculation */ }

  const percentage = (totalUsed + totalAvailable) > 0
    ? Math.round((totalUsed / (totalUsed + totalAvailable)) * 100)
    : 0

  return {
    totalUsed,
    totalAvailable,
    percentage,
    oldestBackup: oldest,
    backupCount,
    growthTrend: {
      daily: totalUsed > 0 ? Math.round(totalUsed / 30) : 0,
      weekly: totalUsed > 0 ? Math.round((totalUsed / 30) * 7) : 0,
    },
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
  const warnings: { type: 'error' | 'warning' | 'info'; message: string; action?: string }[] = []

  const recentFailures = (db.prepare(`
    SELECT COUNT(*) as count FROM job_history
    WHERE status = 'failed' AND started_at >= datetime('now', '-24 hours')
  `).get() as { count: number }).count

  if (recentFailures > 0) {
    warnings.push({
      type: 'error',
      message: `${recentFailures} backup(s) failed in the last 24 hours`,
      action: 'View logs',
    })
  }

  const lastSuccess = (db.prepare(`
    SELECT MAX(ended_at) as lastTime FROM job_history WHERE status = 'success'
  `).get() as { lastTime: string | null }).lastTime

  if (lastSuccess) {
    const hoursSince = (Date.now() - new Date(lastSuccess).getTime()) / (1000 * 60 * 60)
    if (hoursSince > 168) {
      warnings.push({ type: 'error', message: 'No successful backup in over 7 days', action: 'Run backup now' })
    } else if (hoursSince > 48) {
      warnings.push({ type: 'warning', message: 'No backup in over 48 hours', action: 'Check schedule' })
    }
  } else {
    warnings.push({ type: 'info', message: 'No backups completed yet', action: 'Set up a job' })
  }

  return warnings
}

function getNextScheduleApprox(): string {
  const now = new Date()
  now.setHours(now.getHours() + 1)
  return now.toISOString()
}
