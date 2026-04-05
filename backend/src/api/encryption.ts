import { type FastifyInstance } from 'fastify'
import {
  isEncryptionConfigured,
  setupEncryption,
  verifyEncryptionPassword,
  resetEncryptionPassword,
} from '../utils/encryptionKey.js'

interface SetupBody {
  password: string
}

interface VerifyBody {
  password: string
}

interface RecoverBody {
  recoveryKey: string
  newPassword: string
}

export async function encryptionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/encryption/status', { preHandler: [app.authenticate] }, async (_request, reply) => {
    return reply.send({ configured: isEncryptionConfigured() })
  })

  app.post<{ Body: SetupBody }>('/api/encryption/setup', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      if (isEncryptionConfigured()) {
        return reply.status(400).send({ error: 'Encryption already configured' })
      }

      const { password } = request.body

      if (!password || password.length < 12) {
        return reply.status(400).send({ error: 'Encryption password must be at least 12 characters' })
      }

      const recoveryKey = await setupEncryption(password)

      return reply.send({ success: true, recoveryKey })
    } catch (error: unknown) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })

  app.post<{ Body: VerifyBody }>('/api/encryption/verify', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { password } = request.body
      const valid = await verifyEncryptionPassword(password)
      return reply.send({ valid })
    } catch (error: unknown) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })

  app.post<{ Body: RecoverBody }>('/api/encryption/recover', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { recoveryKey, newPassword } = request.body

      if (!newPassword || newPassword.length < 12) {
        return reply.status(400).send({ error: 'New password must be at least 12 characters' })
      }

      await resetEncryptionPassword(recoveryKey, newPassword)

      return reply.send({ success: true })
    } catch (error: unknown) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })
}
