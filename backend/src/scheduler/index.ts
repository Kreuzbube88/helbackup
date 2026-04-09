import schedule from 'node-schedule'
import { parseExpression } from 'cron-parser'
import { randomUUID } from 'crypto'
import { db } from '../db/database.js'
import { logger } from '../utils/logger.js'
import { JobExecutionEngine, type JobStep } from '../execution/engine.js'
import { activeExecutions } from '../execution/active.js'
import type { JobRow, TargetRow } from '../types/rows.js'
import type { JobHistoryRow } from '../types/rows.js'

const activeJobs = new Map<string, schedule.Job>()

export function initScheduler(): void {
  logger.info('Initializing job scheduler')

  const jobs = db
    .prepare('SELECT * FROM jobs WHERE enabled = 1 AND schedule IS NOT NULL')
    .all() as JobRow[]

  for (const job of jobs) {
    scheduleJob(job)
    if (job.catch_up_on_start === 1) {
      maybeCatchUp(job)
    }
  }

  logger.info(`Scheduler initialized with ${jobs.length} jobs`)

  // Auto-create a default (disabled) self-backup job on first boot if none exists
  maybeCreateDefaultSelfBackupJob()

  // Nightly log retention — runs at 04:00 every day
  schedule.scheduleJob('0 4 * * *', () => {
    try {
      const retentionRow = db.prepare("SELECT value FROM settings WHERE key = 'log_retention_days'").get() as { value: string } | undefined
      const retentionDays = retentionRow ? parseInt(retentionRow.value, 10) : 90
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
      const result = db.prepare(
        "DELETE FROM logs WHERE ts < ?"
      ).run(cutoff)
      logger.info({ deleted: result.changes, retentionDays }, 'Log retention cleanup completed')
    } catch (err: unknown) {
      logger.error({ err }, 'Log retention cleanup failed')
    }
  })
}

/**
 * Enqueue a catch-up run if the job missed its last scheduled tick while
 * the container was down. Only fires when catch_up_on_start = 1.
 */
function maybeCatchUp(job: JobRow): void {
  if (!job.schedule) return

  // Find the most recent completed run
  const lastRun = db.prepare(
    "SELECT ended_at FROM job_history WHERE job_id = ? AND status = 'success' ORDER BY ended_at DESC LIMIT 1"
  ).get(job.id) as Pick<JobHistoryRow, 'ended_at'> | undefined

  if (!lastRun?.ended_at) {
    // Job has never run — let the normal schedule pick it up
    return
  }

  let lastTick: Date
  try {
    const interval = parseExpression(job.schedule, { currentDate: new Date() })
    lastTick = interval.prev().toDate()
  } catch {
    logger.warn({ jobId: job.id }, 'catch-up: could not parse cron expression')
    return
  }

  const lastSuccessAt = new Date(lastRun.ended_at)
  if (lastSuccessAt >= lastTick) {
    // Last success was after the most recent scheduled tick — no catch-up needed
    return
  }

  logger.info({ jobId: job.id, lastSuccess: lastRun.ended_at, lastTick: lastTick.toISOString() },
    'Catch-up: job missed a scheduled run — enqueueing now')
  enqueueJob(job)
}

function enqueueJob(job: JobRow): void {
  // Skip if recovery mode is active
  const rm = db.prepare("SELECT value FROM settings WHERE key = 'recovery_mode'").get() as { value: string } | undefined
  if (rm?.value === '1') {
    logger.warn({ jobId: job.id }, 'Job enqueue skipped — recovery mode active')
    return
  }

  // Concurrency guard
  for (const [, engine] of activeExecutions) {
    if (engine.getJobId() === job.id) {
      logger.warn({ jobId: job.id }, 'Job enqueue skipped — previous run still active')
      return
    }
  }

  let steps: JobStep[]
  try {
    steps = JSON.parse(job.steps) as JobStep[]
  } catch {
    logger.error({ jobId: job.id }, 'Invalid job steps JSON — skipping catch-up run')
    return
  }

  const engine = new JobExecutionEngine(job.id)
  const runId = engine.getRunId()
  activeExecutions.set(runId, engine)

  const hooks = {
    prePath: job.pre_backup_script ?? undefined,
    postPath: job.post_backup_script ?? undefined,
  }

  void (async () => {
    try {
      await engine.execute(steps, hooks)
    } catch (err: unknown) {
      logger.error({ runId, jobId: job.id, err }, 'Catch-up job execution failed')
    } finally {
      activeExecutions.delete(runId)
    }
  })()
}

export function scheduleJob(job: JobRow): void {
  cancelJob(job.id)
  if (!job.schedule) return

  const scheduled = schedule.scheduleJob(job.schedule, () => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Executing scheduled job')

    // Skip if this job is already running
    for (const [, engine] of activeExecutions) {
      if (engine.getJobId() === job.id) {
        logger.warn({ jobId: job.id }, 'Scheduled job skipped — previous run still active')
        return
      }
    }

    enqueueJob(job)
  })

  if (scheduled) {
    activeJobs.set(job.id, scheduled)
    logger.info({ jobId: job.id, cron: job.schedule }, 'Job scheduled')
  } else {
    logger.error({ jobId: job.id, cron: job.schedule }, 'Invalid cron expression')
  }
}

export function cancelJob(jobId: string): void {
  const job = activeJobs.get(jobId)
  if (job) {
    job.cancel()
    activeJobs.delete(jobId)
    logger.info({ jobId }, 'Job cancelled')
  }
}

export function stopScheduler(): void {
  logger.info('Stopping scheduler')
  activeJobs.forEach(job => job.cancel())
  activeJobs.clear()
}

/**
 * On first boot (no setting `self_backup_job_created`), if at least one target
 * exists, create a disabled self-backup job so the user is reminded to set one up.
 * The job is created disabled — the user must enable it explicitly.
 */
function maybeCreateDefaultSelfBackupJob(): void {
  const alreadyCreated = db.prepare(
    "SELECT value FROM settings WHERE key = 'self_backup_job_created'"
  ).get() as { value: string } | undefined
  if (alreadyCreated) return

  const target = db.prepare(
    "SELECT * FROM targets WHERE enabled = 1 LIMIT 1"
  ).get() as TargetRow | undefined
  if (!target) return  // No targets yet — will be called again on next start

  const existingSelfBackup = db.prepare(
    "SELECT id FROM jobs WHERE steps LIKE '%helbackup_self%' LIMIT 1"
  ).get() as { id: string } | undefined
  if (existingSelfBackup) {
    // User already has a self-backup job — just mark the setting
    db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('self_backup_job_created', '1')").run()
    return
  }

  const jobId = randomUUID()
  const steps: JobStep[] = [{
    id: randomUUID(),
    type: 'helbackup_self',
    config: { targetId: target.id, useEncryption: false },
    retry: { max_attempts: 1, backoff: 'linear' },
  }]

  db.prepare(
    'INSERT INTO jobs (id, name, enabled, schedule, steps, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?, ?)'
  ).run(
    jobId,
    'HELBACKUP Self-Backup (auto-created)',
    '0 3 * * *',
    JSON.stringify(steps),
    new Date().toISOString(),
    new Date().toISOString(),
  )
  db.prepare("INSERT INTO settings (key, value) VALUES ('self_backup_job_created', '1')").run()

  logger.info({ jobId, targetId: target.id },
    'Auto-created default self-backup job (disabled — enable it in Settings → Jobs)')
}
