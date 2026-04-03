import { FastifyInstance } from 'fastify'
import { executeRsync } from '../tools/rsync.js'
import { createTarArchive } from '../tools/tar.js'
import { testRcloneRemote } from '../tools/rclone.js'

interface RsyncTestBody {
  source: string
  destination: string
}

interface TarTestBody {
  source: string
  destination: string
}

interface RcloneTestBody {
  remote: string
  configPath?: string
}

export async function toolsRoutes(app: FastifyInstance) {
  app.post<{ Body: RsyncTestBody }>(
    '/api/tools/rsync/test',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const result = await executeRsync({
          source: request.body.source,
          destination: request.body.destination,
          onLog: (msg) => app.log.info(msg),
        })
        return reply.send(result)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return reply.status(500).send({ error: message })
      }
    }
  )

  app.post<{ Body: TarTestBody }>(
    '/api/tools/tar/test',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const result = await createTarArchive({
          source: request.body.source,
          destination: request.body.destination,
          compress: true,
          onLog: (msg) => app.log.info(msg),
        })
        return reply.send(result)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return reply.status(500).send({ error: message })
      }
    }
  )

  app.post<{ Body: RcloneTestBody }>(
    '/api/tools/rclone/test',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const success = await testRcloneRemote(request.body.remote, request.body.configPath)
        return reply.send({ success })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return reply.status(500).send({ error: message })
      }
    }
  )
}
