import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'node:crypto'
import { db } from '../db/database.js'
import { activeExecutions } from '../execution/active.js'
import { tokenAuth } from '../middleware/tokenAuth.js'

// Short-lived SSE tokens: token → { runId, expiresAt }
const sseTokens = new Map<string, { runId: string; expiresAt: number }>()

interface LogRow {
  id: number
  run_id: string
  step_id: string | null
  sequence: number | null
  level: string
  category: string
  message: string
  metadata: string | null
  ts: string
}

export async function logsRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/logs/:runId/stream-token — issue short-lived SSE token (60s TTL)
  app.post<{ Params: { runId: string } }>(
    '/api/logs/:runId/stream-token',
    {
      preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
        // Accept JWT (UI) or API token (HELDASH)
        const auth = request.headers.authorization ?? ''
        if (auth.startsWith('Bearer helbackup_')) {
          await tokenAuth(request, reply, 'read')
        } else {
          await app.authenticate(request, reply)
        }
      }],
    },
    async (request: FastifyRequest<{ Params: { runId: string } }>, reply: FastifyReply) => {
      const sseToken = randomUUID()
      sseTokens.set(sseToken, { runId: request.params.runId, expiresAt: Date.now() + 60_000 })
      // Purge expired tokens on each issuance
      for (const [k, v] of sseTokens) {
        if (v.expiresAt < Date.now()) sseTokens.delete(k)
      }
      return reply.send({ sseToken })
    }
  )

  // GET /api/logs/:runId/stream — SSE live stream
  // Accepts ?sseToken= (short-lived, preferred) or ?token= (JWT, legacy fallback)
  app.get<{ Params: { runId: string }; Querystring: { sseToken?: string; token?: string } }>(
    '/api/logs/:runId/stream',
    async (request: FastifyRequest<{ Params: { runId: string }; Querystring: { sseToken?: string; token?: string } }>, reply: FastifyReply) => {
      const { sseToken, token } = request.query as { sseToken?: string; token?: string }
      const { runId } = request.params

      if (sseToken) {
        // Validate short-lived SSE token
        const entry = sseTokens.get(sseToken)
        if (!entry || entry.expiresAt < Date.now() || entry.runId !== runId) {
          return reply.status(401).send({ error: 'Invalid or expired SSE token' })
        }
        sseTokens.delete(sseToken) // one-time use
      } else {
        // Legacy: accept JWT in query param for EventSource clients
        try {
          if (token) {
            app.jwt.verify(token)
          } else {
            await request.jwtVerify()
          }
        } catch {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
      }
      reply.raw.setHeader('Content-Type', 'text/event-stream')
      reply.raw.setHeader('Cache-Control', 'no-cache')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.hijack()

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
