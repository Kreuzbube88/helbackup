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

      // Verify the path exists and is a directory (stat works on FUSE/Shfs)
      try {
        const st = await fsNode.stat(resolved)
        if (!st.isDirectory()) {
          return reply.status(400).send({ error: 'Path is not a directory' })
        }
      } catch {
        return reply.status(404).send({ error: 'Directory not found' })
      }

      const parent = path.dirname(resolved)
      const parentAllowed = resolved !== parent && isPathAllowed(parent)

      // readdir WITHOUT withFileTypes — Unraid's Shfs (FUSE) does not reliably
      // report d_type in dirent, so withFileTypes can fail or misclassify entries.
      // Instead, stat each entry individually to determine if it is a directory.
      let dirs: FsEntry[] = []
      try {
        const names = await fsNode.readdir(resolved)
        const results = await Promise.allSettled(
          names.map(async name => {
            const entryPath = path.join(resolved, name)
            const st = await fsNode.stat(entryPath)
            return st.isDirectory() ? { name, path: entryPath } : null
          })
        )
        dirs = results
          .filter((r): r is PromiseFulfilledResult<FsEntry> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value)
          .sort((a, b) => a.name.localeCompare(b.name))
      } catch {
        // readdir failed (e.g. permission denied) but the directory itself exists —
        // return empty entries so the user can still select this path.
        dirs = []
      }

      return reply.send({
        path: resolved,
        parent: resolved !== parent ? parent : null,
        parentAllowed,
        entries: dirs,
      })
    }
  )
}
