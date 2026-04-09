import { type FastifyInstance } from 'fastify'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'fs/promises'
import { wakeNAS } from '../nas/wol.js'
import { testSSHConnection, deployPublicKey, type SSHConfig } from '../nas/ssh.js'

const execFileAsync = promisify(execFile)

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

interface SetupSSHKeyBody {
  host: string
  port?: number
  username: string
  password: string
}

export async function nasRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: WakeTestBody }>(
    '/api/nas/wake/test',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        await wakeNAS({ mac: request.body.mac, ip: request.body.ip, timeout: 60000, wait: false })
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

  app.post<{ Body: SetupSSHKeyBody }>(
    '/api/nas/setup-ssh-key',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { host, port, username, password } = request.body
      if (!host || !username || !password)
        return reply.status(400).send({ error: 'host, username and password are required' })
      try {
        const safeName = host.replace(/[^a-z0-9]/gi, '_')
        const keyPath = `/app/config/ssh/nas_${safeName}`
        await fs.mkdir('/app/config/ssh', { recursive: true })
        const keyExists = await fs.access(keyPath).then(() => true).catch(() => false)
        if (!keyExists) {
          await execFileAsync('ssh-keygen', ['-t', 'ed25519', '-f', keyPath, '-N', '', '-C', `helbackup@${host}`, '-q'])
        }
        await fs.chmod(keyPath, 0o600)
        const pubKey = await fs.readFile(`${keyPath}.pub`, 'utf-8')
        await deployPublicKey({ host, port, username, password }, pubKey.trim())
        return reply.send({ privateKeyPath: keyPath })
      } catch (err: unknown) {
        return reply.status(500).send({ error: err instanceof Error ? err.message : String(err) })
      }
    }
  )
}
