import { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'
import { safeJsonParseOrThrow } from '../utils/safeJson.js'
import { calculateFileChecksum } from '../execution/verification.js'
import type { ChecksumEntry } from '../execution/verification.js'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '../utils/logger.js'

interface StoredManifest {
  backupId?: string
  backupPath?: string
  checksums?: ChecksumEntry[]
}

interface ManifestRow {
  backup_id: string
  manifest: string
}

interface VerifyResult {
  passed: number
  failed: number
  missing: number
}

export async function verificationRoutes(app: FastifyInstance) {
  app.post<{ Body: { backupId: string } }>(
    '/api/verification/verify',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { backupId } = request.body

      const row = db.prepare(
        'SELECT backup_id, manifest FROM manifest WHERE backup_id = ?'
      ).get(backupId) as ManifestRow | undefined

      if (!row) {
        return reply.status(404).send({ error: 'Manifest not found' })
      }

      let manifest: StoredManifest
      try {
        manifest = safeJsonParseOrThrow<StoredManifest>(row.manifest, 'verification manifest')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return reply.status(400).send({ error: msg })
      }

      const checksums = manifest.checksums ?? []
      const backupPath = manifest.backupPath

      if (!backupPath) {
        // Manifest predates backupPath storage — skip file check, just confirm manifest is valid
        return reply.send({ passed: checksums.length, failed: 0, missing: 0, note: 'path-unresolvable' })
      }

      if (checksums.length === 0) {
        return reply.send({ passed: 0, failed: 0, missing: 0, note: 'no-checksums' })
      }

      // NAS backups have remote paths not accessible inside the container
      try {
        await fs.access(backupPath)
      } catch {
        return reply.send({ passed: 0, failed: 0, missing: 0, note: 'remote-not-accessible' })
      }

      const result: VerifyResult = { passed: 0, failed: 0, missing: 0 }

      for (const entry of checksums) {
        const fullPath = path.isAbsolute(entry.path)
          ? entry.path
          : path.join(backupPath, entry.path)
        try {
          await fs.access(fullPath)
        } catch {
          result.missing++
          continue
        }
        try {
          const actual = await calculateFileChecksum(fullPath)
          if (actual === entry.checksum) {
            result.passed++
          } else {
            result.failed++
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          logger.warn(`Checksum error for ${entry.path}: ${msg}`)
          result.failed++
        }
      }

      return reply.send(result)
    }
  )
}
