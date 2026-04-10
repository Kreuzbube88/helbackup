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
      const rawPath = request.query.path ?? '/unraid/'

      if (!isPathAllowed(rawPath)) {
        return reply.status(403).send({ error: 'Path not allowed' })
      }

      const resolved = path.resolve(rawPath)

      // Shfs/FUSE (Unraid cache-only user shares) may fail to stat virtual union
      // directories even though readdir and file access work fine.
      // Use stat as a hint only — fall through to readdir either way.
      // Only return 404 if BOTH stat and readdir fail.
      let statOk = false
      try {
        const st = await fsNode.stat(resolved)
        if (!st.isDirectory()) {
          return reply.status(400).send({ error: 'Path is not a directory' })
        }
        statOk = true
      } catch {
        // stat failed — may be a FUSE virtual directory; try readdir below
      }

      const parent = path.dirname(resolved)
      const parentAllowed = resolved !== parent && isPathAllowed(parent)

      // readdir WITHOUT withFileTypes — Unraid's Shfs (FUSE) does not reliably
      // report d_type in dirent. Stat each entry individually instead.
      let dirs: FsEntry[] = []
      let readdirOk = false
      try {
        const names = await fsNode.readdir(resolved)
        readdirOk = true
        const results = await Promise.allSettled(
          names.map(async name => {
            const entryPath = path.join(resolved, name)
            try {
              const st = await fsNode.stat(entryPath)
              return st.isDirectory() ? { name, path: entryPath } : null
            } catch {
              // stat failed for this entry — include optimistically (FUSE virtual dir)
              return { name, path: entryPath }
            }
          })
        )
        dirs = results
          .filter((r): r is PromiseFulfilledResult<FsEntry> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value)
          .sort((a, b) => a.name.localeCompare(b.name))
      } catch {
        // readdir failed — if stat also failed, the path is truly inaccessible
      }

      if (!statOk && !readdirOk) {
        return reply.status(404).send({ error: 'Directory not found' })
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
