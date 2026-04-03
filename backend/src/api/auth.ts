import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { db } from '../db/database.js'

interface LoginBody {
  username: string
  password: string
}

interface UserRow {
  id: number
  username: string
  password_hash: string
}

function sanitizeUser(user: UserRow): { id: number; username: string } {
  return { id: user.id, username: user.username }
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginBody }>(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { username, password } = request.body

      const user = db
        .prepare('SELECT * FROM users WHERE username = ?')
        .get(username) as UserRow | undefined

      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }

      const valid = await bcrypt.compare(password, user.password_hash)
      if (!valid) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }

      const token = app.jwt.sign({ id: user.id, username: user.username })
      return reply.send({ token, user: sanitizeUser(user) })
    }
  )

  app.post(
    '/api/auth/logout',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ ok: true })
    }
  )

  app.get(
    '/api/auth/me',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { id: number; username: string }
      const user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(payload.id) as UserRow | undefined

      if (!user) {
        return reply.status(404).send({ error: 'User not found' })
      }

      return reply.send({ user: sanitizeUser(user) })
    }
  )
}
