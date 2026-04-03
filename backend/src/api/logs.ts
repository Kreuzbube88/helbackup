import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/database.js'

interface LogRow {
  id: number
  run_id: string
  step_id: string | null
  level: string
  message: string
  ts: string
}

export async function logsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/logs/:runId/stream — SSE endpoint
  app.get<{ Params: { runId: string } }>(
    '/api/logs/:runId/stream',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { runId: string } }>, reply: FastifyReply) => {
      reply.raw.setHeader('Content-Type', 'text/event-stream')
      reply.raw.setHeader('Cache-Control', 'no-cache')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.hijack()

      const send = (event: string, data: unknown): void => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      }

      const existingLogs = db
        .prepare('SELECT * FROM logs WHERE run_id = ? ORDER BY id ASC')
        .all(request.params.runId) as LogRow[]

      for (const log of existingLogs) {
        send('log', log)
      }

      // Phase 5 will implement real-time streaming; for now close after backlog
      send('complete', { runId: request.params.runId })
      reply.raw.end()
    }
  )

  // GET /api/logs/:runId — JSON endpoint for full log retrieval
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
