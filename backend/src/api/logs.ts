import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/database.js'
import { activeExecutions } from '../execution/active.js'

interface LogRow {
  id: number
  run_id: string
  step_id: string | null
  level: string
  message: string
  ts: string
}

export async function logsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/logs/:runId/stream — SSE live stream
  app.get<{ Params: { runId: string } }>(
    '/api/logs/:runId/stream',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { runId: string } }>, reply: FastifyReply) => {
      reply.raw.setHeader('Content-Type', 'text/event-stream')
      reply.raw.setHeader('Cache-Control', 'no-cache')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.hijack()

      const { runId } = request.params

      const send = (event: string, data: unknown): void => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      }

      // Replay backlog from DB
      const backlog = db
        .prepare('SELECT * FROM logs WHERE run_id = ? ORDER BY id ASC')
        .all(runId) as LogRow[]
      for (const log of backlog) send('log', log)

      const engine = activeExecutions.get(runId)
      if (!engine) {
        // Job already finished — send complete and close
        send('complete', { runId })
        reply.raw.end()
        return
      }

      // Subscribe to live events
      const onLog = (data: unknown) => send('log', data)
      const onComplete = () => { send('complete', { runId }); reply.raw.end() }
      const onError = (data: unknown) => { send('error', data); reply.raw.end() }

      engine.on('log', onLog)
      engine.once('job:complete', onComplete)
      engine.once('job:error', onError)

      request.raw.on('close', () => {
        engine.off('log', onLog)
        engine.off('job:complete', onComplete)
        engine.off('job:error', onError)
      })
    }
  )

  // GET /api/logs/:runId — full log retrieval (JSON)
  app.get<{ Params: { runId: string } }>(
    '/api/logs/:runId',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { runId: string } }>, reply: FastifyReply) => {
      const logs = db
        .prepare('SELECT * FROM logs WHERE run_id = ? ORDER BY id ASC')
        .all(request.params.runId) as LogRow[]
      return reply.send(logs)
    }
  )
}
