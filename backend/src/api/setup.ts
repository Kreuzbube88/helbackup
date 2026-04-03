import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { db } from '../db/database.js'
import { isFirstRun } from '../utils/setupDetection.js'
import { generateRecoveryKey, hashRecoveryKey } from '../utils/recoveryKey.js'

interface CompleteSetupBody {
  username: string
  password: string
}

export async function setupRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/setup/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ firstRun: isFirstRun() })
  })

  app.post<{ Body: CompleteSetupBody }>(
    '/api/setup/complete',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 3 },
            password: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CompleteSetupBody }>, reply: FastifyReply) => {
      if (!isFirstRun()) {
        return reply.status(400).send({ error: 'Setup already completed' })
      }

      const { username, password } = request.body

      const recoveryKey = generateRecoveryKey()
      const [passwordHash, recoveryKeyHash] = await Promise.all([
        bcrypt.hash(password, 10),
        hashRecoveryKey(recoveryKey),
      ])

      db.prepare(
        'INSERT INTO admin (id, username, password_hash, recovery_key_hash, created_at) VALUES (1, ?, ?, ?, ?)'
      ).run(username, passwordHash, recoveryKeyHash, new Date().toISOString())

      return reply.send({ success: true, recoveryKey })
    }
  )
}
