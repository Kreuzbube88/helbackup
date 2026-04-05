import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import fastifyRateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from './utils/logger.js'
import { authRoutes } from './api/auth.js'
import { setupRoutes } from './api/setup.js'
import { jobsRoutes } from './api/jobs.js'
import { targetsRoutes } from './api/targets.js'
import { dockerRoutes } from './api/docker.js'
import { logsRoutes } from './api/logs.js'
import { toolsRoutes } from './api/tools.js'
import { nasRoutes } from './api/nas.js'
import { initScheduler, stopScheduler } from './scheduler/index.js'
import { executionRoutes } from './api/execution.js'
import recoveryRoutes from './api/recovery.js'
import { encryptionRoutes } from './api/encryption.js'
import { decryptionRoutes } from './api/decryption.js'
import { notificationRoutes } from './api/notifications.js'
import { dashboardRoutes } from './api/dashboard.js'
import { gfsRetentionRoutes } from './api/gfsRetention.js'
import { restoreWizardRoutes } from './api/restoreWizard.js'
import { verificationRoutes } from './api/verification.js'
import { notificationManager } from './notifications/notificationManager.js'
import { tokenRoutes } from './api/tokens.js'
import { webhookRoutes } from './api/webhooks.js'
import { statusRoutesV1 } from './api/v1/status.js'
import { backupsRoutesV1 } from './api/v1/backups.js'
import { jobsRoutesV1 } from './api/v1/jobs.js'
import { widgetRoutesV1 } from './api/v1/widget.js'
import { metricsRoutes } from './metrics/prometheus.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 3000)
const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production'

if (JWT_SECRET === 'change-me-in-production') {
  logger.warn('JWT_SECRET is using the default value — set JWT_SECRET env var before exposing to network')
}

const app = Fastify({ logger: false, bodyLimit: 100 * 1024 * 1024 })

await app.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : false),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
})

await app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
  allowList: ['127.0.0.1', '::1'],
  keyGenerator: (request) => {
    const token = request.headers.authorization?.substring(7)
    return token ?? request.ip
  },
  errorResponseBuilder: (_request, context) => ({
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: `Rate limit exceeded. Try again in ${Math.ceil(Number(context.after) / 1000)} seconds.`,
    },
  }),
})

await app.register(swagger, {
  openapi: {
    info: {
      title: 'HELBACKUP API',
      description: 'Backup automation API for Unraid',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        apiToken: {
          type: 'http',
          scheme: 'bearer',
          description: 'API Token (format: helbackup_...)',
        },
      },
    },
  },
})

await app.register(swaggerUi, {
  routePrefix: '/api/docs',
  uiConfig: { docExpansion: 'list', deepLinking: false },
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

// Load notification channels
notificationManager.loadChannels()

// Register routes
await app.register(setupRoutes)
await app.register(authRoutes)
await app.register(jobsRoutes)
await app.register(targetsRoutes)
await app.register(dockerRoutes)
await app.register(logsRoutes)
await app.register(toolsRoutes)
await app.register(nasRoutes)
await app.register(executionRoutes)
await app.register(recoveryRoutes)
await app.register(encryptionRoutes)
await app.register(decryptionRoutes)
await app.register(notificationRoutes)
await app.register(dashboardRoutes)
await app.register(gfsRetentionRoutes)
await app.register(restoreWizardRoutes)
await app.register(verificationRoutes)
await app.register(tokenRoutes)
await app.register(webhookRoutes)
await app.register(statusRoutesV1)
await app.register(backupsRoutesV1)
await app.register(jobsRoutesV1)
await app.register(widgetRoutesV1)
await app.register(metricsRoutes)

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
