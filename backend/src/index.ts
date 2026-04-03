import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from './utils/logger.js'
import { authRoutes } from './api/auth.js'
import { jobsRoutes } from './api/jobs.js'
import { targetsRoutes } from './api/targets.js'
import { dockerRoutes } from './api/docker.js'
import { logsRoutes } from './api/logs.js'
import { toolsRoutes } from './api/tools.js'
import { nasRoutes } from './api/nas.js'
import { initScheduler, stopScheduler } from './scheduler/index.js'
import { executionRoutes } from './api/execution.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 3000)
const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production'

const app = Fastify({ logger: false })

await app.register(fastifyCors, {
  origin: process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : false,
})

await app.register(fastifyCookie)

await app.register(fastifyJwt, { secret: JWT_SECRET })

app.decorate('authenticate', async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Unauthorized' })
  }
})

// Initialize scheduler
initScheduler()

// Register routes
await app.register(authRoutes)
await app.register(jobsRoutes)
await app.register(targetsRoutes)
await app.register(dockerRoutes)
await app.register(logsRoutes)
await app.register(toolsRoutes)
await app.register(nasRoutes)
await app.register(executionRoutes)

// Serve React SPA in production
const distPath = path.join(__dirname, '../frontend/dist')
await app.register(fastifyStatic, {
  root: distPath,
  prefix: '/',
  decorateReply: false,
})

app.setNotFoundHandler(async (request, reply) => {
  if (!request.url.startsWith('/api')) {
    const html = fs.readFileSync('/app/frontend/dist/index.html', 'utf-8')
    return reply.type('text/html').send(html)
  }
  reply.status(404).send({ error: 'Not Found' })
})

app.addHook('onError', async (_request, _reply, error) => {
  logger.error(error)
})

// Graceful shutdown
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, shutting down gracefully`)
  stopScheduler()
  await app.close()
  process.exit(0)
}

process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT', () => { void shutdown('SIGINT') })

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  logger.info(`HELBACKUP listening on :${PORT}`)
} catch (err) {
  logger.fatal(err, 'Failed to start server')
  process.exit(1)
}
