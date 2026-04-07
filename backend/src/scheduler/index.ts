import schedule from 'node-schedule'
import { db } from '../db/database.js'
import { logger } from '../utils/logger.js'
import { JobExecutionEngine, type JobStep } from '../execution/engine.js'
import { activeExecutions } from '../execution/active.js'
import type { JobRow } from '../types/rows.js'

const activeJobs = new Map<string, schedule.Job>()

export function initScheduler(): void {
  logger.info('Initializing job scheduler')

  const jobs = db
    .prepare('SELECT * FROM jobs WHERE enabled = 1 AND schedule IS NOT NULL')
    .all() as JobRow[]

  for (const job of jobs) {
    scheduleJob(job)
  }

  logger.info(`Scheduler initialized with ${jobs.length} jobs`)
}

export function scheduleJob(job: JobRow): void {
  cancelJob(job.id)
  if (!job.schedule) return

  const scheduled = schedule.scheduleJob(job.schedule, () => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Executing scheduled job')

    let steps: JobStep[]
    try {
      steps = JSON.parse(job.steps) as JobStep[]
    } catch {
      logger.error({ jobId: job.id }, 'Invalid job steps JSON — skipping scheduled run')
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
        logger.error({ runId, jobId: job.id, err }, 'Scheduled job execution failed')
      } finally {
        activeExecutions.delete(runId)
      }
    })()
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
