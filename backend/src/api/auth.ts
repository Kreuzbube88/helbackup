import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { db } from '../db/database.js'
import { verifyRecoveryKey } from '../utils/recoveryKey.js'

interface LoginBody {
  username: string
  password: string
}

interface ChangePasswordBody {
  currentPassword: string
  newPassword: string
}

interface RecoverBody {
  recoveryKey: string
  newPassword: string
}

interface AdminRow {
  id: number
  username: string
  password_hash: string
  recovery_key_hash: string
  language: string
}

function sanitizeAdmin(admin: AdminRow): { id: number; username: string } {
  return { id: admin.id, username: admin.username }
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

      const admin = db
        .prepare('SELECT * FROM admin WHERE id = 1 AND username = ?')
        .get(username) as AdminRow | undefined

      if (!admin) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }

      const valid = await bcrypt.compare(password, admin.password_hash)
      if (!valid) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }

      db.prepare('UPDATE admin SET last_login = ? WHERE id = 1').run(new Date().toISOString())

      const token = app.jwt.sign({ id: admin.id, username: admin.username })
      return reply.send({ token, user: sanitizeAdmin(admin) })
    }
  )

  app.post(
    '/api/auth/logout',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ ok: true })
    }
  )

  app.post<{ Body: ChangePasswordBody }>(
    '/api/auth/change-password',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', minLength: 1 },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ChangePasswordBody }>, reply: FastifyReply) => {
      const { currentPassword, newPassword } = request.body

      const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get() as AdminRow | undefined

      if (!admin) {
        return reply.status(404).send({ error: 'Admin account not found' })
      }

      const valid = await bcrypt.compare(currentPassword, admin.password_hash)
      if (!valid) {
        return reply.status(401).send({ error: 'Current password incorrect' })
      }

      const newHash = await bcrypt.hash(newPassword, 12)
      db.prepare('UPDATE admin SET password_hash = ? WHERE id = 1').run(newHash)

      return reply.send({ ok: true })
    }
  )

  app.get(
    '/api/auth/me',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { id: number; username: string }

      const admin = db
        .prepare('SELECT * FROM admin WHERE id = ?')
        .get(payload.id) as AdminRow | undefined

      if (!admin) {
        return reply.status(404).send({ error: 'Admin account not found' })
      }

      return reply.send({ user: sanitizeAdmin(admin) })
    }
  )

  app.get(
    '/api/auth/language',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const admin = db.prepare('SELECT language FROM admin WHERE id = 1').get() as Pick<AdminRow, 'language'> | undefined
      return reply.send({ language: admin?.language ?? 'de' })
    }
  )

  app.post<{ Body: RecoverBody }>(
    '/api/auth/recover',
    {
      schema: {
        body: {
          type: 'object',
          required: ['recoveryKey', 'newPassword'],
          properties: {
            recoveryKey: { type: 'string', minLength: 1 },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RecoverBody }>, reply: FastifyReply) => {
      const { recoveryKey, newPassword } = request.body

      const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get() as AdminRow | undefined

      if (!admin) {
        return reply.status(404).send({ error: 'Admin account not found' })
      }

      const valid = await verifyRecoveryKey(recoveryKey, admin.recovery_key_hash)
      if (!valid) {
        return reply.status(401).send({ error: 'Invalid recovery key' })
      }

      const newHash = await bcrypt.hash(newPassword, 12)
      db.prepare('UPDATE admin SET password_hash = ? WHERE id = 1').run(newHash)

      return reply.send({ success: true })
    }
  )
}
