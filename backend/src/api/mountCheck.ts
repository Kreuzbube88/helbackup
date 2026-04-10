import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fs from 'node:fs/promises'

interface MountIssue {
  containerPath: string
  required: string
}

interface MountCheckResult {
  ok: boolean
  issues: MountIssue[]
}

async function isMounted(mountPath: string, parentPath: string): Promise<boolean> {
  try {
    const [mountStat, parentStat] = await Promise.all([
      fs.stat(mountPath),
      fs.stat(parentPath),
    ])
    return mountStat.dev !== parentStat.dev
  } catch {
    return false
  }
}

export async function mountCheckRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Reply: MountCheckResult }>(
    '/api/mount-check',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const issues: MountIssue[] = []

      const [cacheOk, userOk] = await Promise.all([
        isMounted('/unraid/cache', '/unraid'),
        isMounted('/unraid/user', '/unraid'),
      ])

      if (!cacheOk) {
        issues.push({ containerPath: '/unraid/cache', required: '/mnt/cache:/unraid/cache' })
      }
      if (!userOk) {
        issues.push({ containerPath: '/unraid/user', required: '/mnt/user:/unraid/user' })
      }

      return reply.send({ ok: issues.length === 0, issues })
    }
  )
}
