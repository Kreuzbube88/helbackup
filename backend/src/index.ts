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
import { APP_VERSION } from './utils/version.js'
import { authRoutes } from './api/auth.js'
import { setupRoutes } from './api/setup.js'
import { jobsRoutes } from './api/jobs.js'
import { targetsRoutes } from './api/targets.js'
import { dockerRoutes } from './api/docker.js'
import { vmRoutes } from './api/vms.js'
import { logsRoutes } from './api/logs.js'
import { toolsRoutes } from './api/tools.js'
import { nasRoutes } from './api/nas.js'
import { initScheduler, stopScheduler } from './scheduler/index.js'
import { executionRoutes } from './api/execution.js'
import recoveryRoutes from './api/recovery.js'
import helbackupRoutes from './api/helbackup.js'
import { encryptionRoutes } from './api/encryption.js'
import { decryptionRoutes } from './api/decryption.js'
import { notificationRoutes } from './api/notifications.js'
import { dashboardRoutes } from './api/dashboard.js'
import { gfsRetentionRoutes } from './api/gfsRetention.js'
import { restoreWizardRoutes } from './api/restoreWizard.js'
import { verificationRoutes } from './api/verification.js'
import { notificationManager } from './notifications/notificationManager.js'
import { closeDockerPool } from './docker/client.js'
import { tokenRoutes } from './api/tokens.js'
import { webhookRoutes } from './api/webhooks.js'
import { statusRoutesV1 } from './api/v1/status.js'
import { backupsRoutesV1 } from './api/v1/backups.js'
import { jobsRoutesV1 } from './api/v1/jobs.js'
import { widgetRoutesV1 } from './api/v1/widget.js'
import { historyRoutesV1 } from './api/v1/history.js'
import { targetsRoutesV1 } from './api/v1/targets.js'
import { metricsRoutes } from './metrics/prometheus.js'
import { healthRoutes } from './api/health.js'
import { settingsRoutes } from './api/settings.js'
import { fsRoutes } from './api/fs.js'
import { mountCheckRoutes } from './api/mountCheck.js'
import { auditRoutes } from './api/audit.js'
import { auditLog } from './utils/audit.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 3000)
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  logger.fatal('JWT_SECRET environment variable is required — aborting startup')
  process.exit(1)
}

// Entropy check: require at least 32 chars and a minimum Shannon entropy of 3.5 bits/char
if (JWT_SECRET.length < 32) {
  logger.fatal(
    `JWT_SECRET is too short (${JWT_SECRET.length} chars, minimum 32). ` +
    'Generate a strong secret with: openssl rand -hex 32'
  )
  process.exit(1)
}

{
  const freq = new Map<string, number>()
  for (const ch of JWT_SECRET) freq.set(ch, (freq.get(ch) ?? 0) + 1)
  const entropy = [...freq.values()].reduce((sum, count) => {
    const p = count / JWT_SECRET.length
    return sum - p * Math.log2(p)
  }, 0)
  if (entropy < 3.5) {
    logger.fatal(
      `JWT_SECRET has low entropy (${entropy.toFixed(2)} bits/char, minimum 3.5). ` +
      'Use a randomly generated secret: openssl rand -hex 32'
    )
    process.exit(1)
  }
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
      version: APP_VERSION,
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

await app.register(fastifyJwt, { secret: JWT_SECRET as string })

app.decorate('authenticate', async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
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
await app.register(vmRoutes)
await app.register(logsRoutes)
await app.register(toolsRoutes)
await app.register(nasRoutes)
await app.register(executionRoutes)
await app.register(recoveryRoutes)
await app.register(helbackupRoutes)
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
await app.register(historyRoutesV1)
await app.register(targetsRoutesV1)
await app.register(metricsRoutes)
await app.register(healthRoutes)
await app.register(settingsRoutes)
await app.register(fsRoutes)
await app.register(mountCheckRoutes)
await app.register(auditRoutes)

// Serve React SPA in production
const distPath = path.join(__dirname, '../frontend/dist')
await app.register(fastifyStatic, {
  root: distPath,
  prefix: '/',
  decorateReply: false,
})

// Cache SPA index.html at startup to avoid synchronous reads on every 404
let spaHtml: string | null = null
try {
  spaHtml = fs.readFileSync('/app/frontend/dist/index.html', 'utf-8')
} catch { /* not available in dev */ }

app.setNotFoundHandler(async (request, reply) => {
  if (!request.url.startsWith('/api') && spaHtml) {
    return reply.type('text/html').send(spaHtml)
  }
  reply.status(404).send({ error: 'Not Found' })
})

app.addHook('onError', async (_request, _reply, error) => {
  logger.error(error)
})

// Audit log for mutating API requests
app.addHook('onResponse', async (request, reply) => {
  const method = request.method
  if (!['POST', 'PUT', 'DELETE'].includes(method)) return
  if (!request.url.startsWith('/api/')) return
  // Skip audit-log endpoint itself to avoid recursion
  if (request.url.startsWith('/api/audit-log')) return
  if (reply.statusCode >= 400) return

  let actor: string | null = null
  try {
    const user = request.user as { sub?: string } | undefined
    actor = user?.sub ?? null
  } catch { /* JWT not verified on this request — actor stays null */ }

  const routerPath = (request.routeOptions as { url?: string } | undefined)?.url ?? request.url
  const resourceId = (request.params as Record<string, string> | undefined)?.id ?? ''

  try {
    auditLog(
      `${method} ${routerPath}`,
      actor,
      routerPath.split('/')[3] ?? 'unknown',
      resourceId,
      { status: reply.statusCode }
    )
  } catch { /* never let audit log failures break responses */ }
})

// Graceful shutdown
let shuttingDown = false
const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
  if (shuttingDown) return
  shuttingDown = true
  logger.info(`${signal} received, shutting down gracefully`)
  try {
    stopScheduler()
    await closeDockerPool()
    await app.close()
  } catch (err) {
    logger.error({ err }, 'Error during graceful shutdown')
  } finally {
    process.exit(exitCode)
  }
}

process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT', () => { void shutdown('SIGINT') })

// Catch fire-and-forget rejections from job execution paths so they don't crash silently.
// Logged but NOT fatal: backup steps run inside `void (async ...)` blocks and a single
// step failure should not take the whole orchestrator down.
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection')
})

// An uncaught exception leaves Node in an undefined state — log it then exit non-zero.
// Docker / Unraid will restart us. The HEALTHCHECK would catch the hang otherwise, but
// failing fast is better.
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down')
  void shutdown('uncaughtException', 1)
})

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  logger.info(`HELBACKUP listening on :${PORT}`)
} catch (err) {
  logger.fatal(err, 'Failed to start server')
  process.exit(1)
}
