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

await app.register(authRoutes)

// Serve React SPA in production
const distPath = path.join(__dirname, '../../frontend/dist')
await app.register(fastifyStatic, {
  root: distPath,
  prefix: '/',
  decorateReply: false,
})

app.setNotFoundHandler(async (request, reply) => {
  if (!request.url.startsWith('/api')) {
    const html = fs.readFileSync(
      path.join(__dirname, '../../frontend/dist/index.html'),
      'utf-8'
    )
    return reply.type('text/html').send(html)
  }
  reply.status(404).send({ error: 'Not Found' })
})

app.addHook('onError', async (_request, _reply, error) => {
  logger.error(error)
})

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  logger.info(`HELBACKUP listening on :${PORT}`)
} catch (err) {
  logger.fatal(err, 'Failed to start server')
  process.exit(1)
}
