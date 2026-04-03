import { type FastifyInstance } from 'fastify'
import { wakeNAS } from '../nas/wol.js'
import { testSSHConnection, type SSHConfig } from '../nas/ssh.js'

interface WakeTestBody {
  mac: string
  ip?: string
}

interface SSHTestBody {
  host: string
  port?: number
  username: string
  password?: string
  privateKey?: string
}

export async function nasRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: WakeTestBody }>(
    '/api/nas/wake/test',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        await wakeNAS({ mac: request.body.mac, ip: request.body.ip, timeout: 60000 })
        return reply.send({ success: true })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return reply.status(500).send({ error: msg })
      }
    }
  )

  app.post<{ Body: SSHTestBody }>(
    '/api/nas/ssh/test',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const config: SSHConfig = {
          host: request.body.host,
          port: request.body.port,
          username: request.body.username,
          password: request.body.password,
          privateKey: request.body.privateKey,
        }
        const success = await testSSHConnection(config)
        return reply.send({ success })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return reply.status(500).send({ error: msg })
      }
    }
  )
}
