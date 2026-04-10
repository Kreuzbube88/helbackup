import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fsNode from 'node:fs/promises'
import path from 'node:path'

const ALLOWED_BASES = ['/unraid/', '/mnt/', '/app/']

function isPathAllowed(p: string): boolean {
  const normalized = path.resolve(p)
  return ALLOWED_BASES.some(base =>
    normalized.startsWith(base) || normalized === base.replace(/\/$/, '')
  )
}

interface BrowseQuery {
  path?: string
}

export interface FsEntry {
  name: string
  path: string
}

export async function fsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: BrowseQuery }>(
    '/api/fs/browse',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Querystring: BrowseQuery }>, reply: FastifyReply) => {
      const rawPath = request.query.path ?? '/unraid/user'

      if (!isPathAllowed(rawPath)) {
        return reply.status(403).send({ error: 'Path not allowed' })
      }

      const resolved = path.resolve(rawPath)

      try {
        const entries = await fsNode.readdir(resolved, { withFileTypes: true })
        const dirs: FsEntry[] = entries
          .filter(e => e.isDirectory())
          .map(e => ({
            name: e.name,
            path: path.join(resolved, e.name),
          }))
          .sort((a, b) => a.name.localeCompare(b.name))

        const parent = path.dirname(resolved)
        const parentAllowed = resolved !== parent && isPathAllowed(parent)

        return reply.send({
          path: resolved,
          parent: resolved !== parent ? parent : null,
          parentAllowed,
          entries: dirs,
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return reply.status(404).send({ error: `Cannot read directory: ${msg}` })
      }
    }
  )
}
