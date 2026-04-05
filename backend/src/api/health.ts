import type { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'

const startedAt = Date.now()

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    const uptime = Math.floor((Date.now() - startedAt) / 1000)

    // DB check
    let dbStatus: 'ok' | 'error' = 'ok'
    try {
      db.prepare('SELECT 1').get()
    } catch {
      dbStatus = 'error'
    }

    const status = dbStatus === 'ok' ? 'healthy' : 'degraded'
    const httpStatus = status === 'healthy' ? 200 : 503

    return reply.status(httpStatus).send({
      status,
      uptime,
      database: dbStatus,
      version: process.env.npm_package_version ?? '1.0.0',
    })
  })
}
