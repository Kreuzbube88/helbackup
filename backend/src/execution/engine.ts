import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { db } from '../db/database.js'
import { logger } from '../utils/logger.js'

export interface JobStep {
  id: string
  type: 'flash' | 'appdata' | 'vms' | 'docker_images' | 'system_config'
  config: Record<string, unknown>
}

interface LogEvent {
  level: string
  message: string
  stepId?: string
  timestamp: string
}

export class JobExecutionEngine extends EventEmitter {
  private readonly runId: string
  private readonly startedAt: string

  constructor(jobId: string) {
    super()
    this.runId = randomUUID()
    this.startedAt = new Date().toISOString()

    db.prepare(
      'INSERT INTO job_history (id, job_id, status, started_at) VALUES (?, ?, ?, ?)'
    ).run(this.runId, jobId, 'running', this.startedAt)

    logger.info({ runId: this.runId }, 'Job execution started')
  }

  async execute(steps: JobStep[]): Promise<void> {
    try {
      for (const step of steps) {
        this.emit('step:start', { stepId: step.id, type: step.type })
        this.log('info', `Starting step: ${step.type}`, step.id)

        try {
          await this.executeStep(step)
          this.emit('step:complete', { stepId: step.id })
          this.log('info', `Step completed: ${step.type}`, step.id)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          this.emit('step:error', { stepId: step.id, error: message })
          this.log('error', `Step failed: ${message}`, step.id)
          throw err
        }
      }

      db.prepare(
        'UPDATE job_history SET status = ?, ended_at = ?, duration_s = ? WHERE id = ?'
      ).run('success', new Date().toISOString(), this.elapsedSeconds(), this.runId)

      this.emit('job:complete')
      logger.info({ runId: this.runId }, 'Job execution completed')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      db.prepare(
        'UPDATE job_history SET status = ?, ended_at = ?, duration_s = ? WHERE id = ?'
      ).run('failed', new Date().toISOString(), this.elapsedSeconds(), this.runId)

      this.emit('job:error', { error: message })
      logger.error({ runId: this.runId, error: message }, 'Job execution failed')
      throw err
    }
  }

  private async executeStep(step: JobStep): Promise<void> {
    switch (step.type) {
      case 'flash': {
        const { executeFlashBackup } = await import('./steps/flash.js')
        await executeFlashBackup(step.config as unknown as Parameters<typeof executeFlashBackup>[0], this)
        break
      }
      case 'appdata': {
        const { executeAppdataBackup } = await import('./steps/appdata.js')
        await executeAppdataBackup(step.config as unknown as Parameters<typeof executeAppdataBackup>[0], this)
        break
      }
      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }
  }

  log(level: string, message: string, stepId?: string): void {
    db.prepare(
      'INSERT INTO logs (run_id, step_id, level, message, ts) VALUES (?, ?, ?, ?, ?)'
    ).run(this.runId, stepId ?? null, level, message, new Date().toISOString())

    const event: LogEvent = { level, message, stepId, timestamp: new Date().toISOString() }
    this.emit('log', event)
  }

  getRunId(): string {
    return this.runId
  }

  private elapsedSeconds(): number {
    return Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000)
  }
}
