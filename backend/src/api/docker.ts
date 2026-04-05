import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { listContainers, listImages, inspectContainer, stopContainer, startContainer } from '../docker/client.js'
import { getSelfContainerId } from '../docker/selfId.js'

function isHelbackup(name: string): boolean {
  return name.toLowerCase().includes('helbackup')
}

async function isSelf(containerId: string): Promise<boolean> {
  const selfId = await getSelfContainerId()
  return selfId !== null && containerId.startsWith(selfId)
}

export async function dockerRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/docker/containers',
    { preHandler: [app.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const selfId = await getSelfContainerId()
        const containers = await listContainers()
        const filtered = containers.filter(c => {
          // Primary: filter by own container ID
          if (selfId && c.Id.startsWith(selfId)) return false
          // Fallback: filter by name containing 'helbackup'
          if (c.Names.some(n => isHelbackup(n.replace('/', '')))) return false
          return true
        })
        return reply.send(filtered)
      } catch (error: unknown) {
        app.log.error(error)
        return reply.status(500).send({ error: 'Failed to list containers' })
      }
    }
  )

  app.get(
    '/api/docker/images',
    { preHandler: [app.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const images = await listImages()
        return reply.send(images)
      } catch (error: unknown) {
        app.log.error(error)
        return reply.status(500).send({ error: 'Failed to list images' })
      }
    }
  )

  app.get<{ Params: { id: string } }>(
    '/api/docker/containers/:id',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const details = await inspectContainer(request.params.id)
        return reply.send(details)
      } catch (error: unknown) {
        app.log.error(error)
        return reply.status(500).send({ error: 'Failed to inspect container' })
      }
    }
  )

  app.post<{ Params: { id: string } }>(
    '/api/docker/containers/:id/stop',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        if (await isSelf(request.params.id)) {
          return reply.status(400).send({ error: 'Cannot stop HELBACKUP container' })
        }
        const details = await inspectContainer(request.params.id)
        if (isHelbackup(details.Name.replace('/', ''))) {
          return reply.status(400).send({ error: 'Cannot stop HELBACKUP container' })
        }
        await stopContainer(request.params.id)
        return reply.send({ ok: true })
      } catch (error: unknown) {
        app.log.error(error)
        return reply.status(500).send({ error: 'Failed to stop container' })
      }
    }
  )

  app.post<{ Params: { id: string } }>(
    '/api/docker/containers/:id/start',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        await startContainer(request.params.id)
        return reply.send({ ok: true })
      } catch (error: unknown) {
        app.log.error(error)
        return reply.status(500).send({ error: 'Failed to start container' })
      }
    }
  )
}
