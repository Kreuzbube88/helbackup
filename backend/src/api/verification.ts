import { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'
import { safeJsonParseOrThrow } from '../utils/safeJson.js'
import { calculateFileChecksum } from '../execution/verification.js'
import type { ChecksumEntry } from '../execution/verification.js'
import type { NasConfig } from '../execution/steps/nasTransfer.js'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '../utils/logger.js'

interface StoredManifest {
  backupId?: string
  backupPath?: string
  targetId?: string
  checksums?: ChecksumEntry[]
  stepPaths?: Array<{ type: string; path: string; targetId?: string }>
}

interface ManifestRow {
  backup_id: string
  manifest: string
}

interface VerifyResult {
  passed: number
  failed: number
  missing: number
  note?: string
}

async function verifyRemoteChecksums(
  nasConfig: NasConfig,
  backupPath: string,
  expected: ChecksumEntry[]
): Promise<VerifyResult> {
  const { executeSSHCommand } = await import('../nas/ssh.js')
  // 10 min timeout — large Docker image tars can take several minutes for sha256sum
  const safeBackupPath = backupPath.replace(/'/g, "'\\''")
  const result = await executeSSHCommand(
    { host: nasConfig.host, port: nasConfig.port, username: nasConfig.username,
      password: nasConfig.password, privateKey: nasConfig.privateKey },
    `find '${safeBackupPath}' -type f -exec sha256sum '{}' ';'`,
    600_000
  )

  if (!result.success || !result.output) {
    logger.warn(`Remote checksum SSH command failed for ${backupPath}: ${result.error ?? 'no output'}`)
    return { passed: 0, failed: 0, missing: expected.length, note: 'remote-ssh-failed' }
  }

  // Parse sha256sum output: "<hash>  /absolute/path/to/file"
  const remoteMap = new Map<string, string>()
  const prefix = backupPath.endsWith('/') ? backupPath : backupPath + '/'
  for (const line of result.output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const spaceIdx = trimmed.indexOf('  ')
    if (spaceIdx === -1) continue
    const hash = trimmed.slice(0, spaceIdx)
    const absPath = trimmed.slice(spaceIdx + 2)
    const relPath = absPath.startsWith(prefix) ? absPath.slice(prefix.length) : absPath
    remoteMap.set(relPath, hash)
  }

  let passed = 0, failed = 0, missing = 0
  for (const entry of expected) {
    const remoteHash = remoteMap.get(entry.path)
    if (!remoteHash) { missing++; continue }
    if (remoteHash === entry.checksum) { passed++ } else { failed++ }
  }

  return { passed, failed, missing, note: 'remote-verified' }
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
        return reply.send({ passed: checksums.length, failed: 0, missing: 0, note: 'path-unresolvable' })
      }

      if (checksums.length === 0) {
        return reply.send({ passed: 0, failed: 0, missing: 0, note: 'no-checksums' })
      }

      // Check if backupPath is locally accessible
      try {
        await fs.access(backupPath)
      } catch {
        // Remote NAS path — attempt SSH-based verification
        const targetId = manifest.targetId ?? manifest.stepPaths?.[0]?.targetId
        if (!targetId) {
          return reply.send({ passed: 0, failed: 0, missing: 0, note: 'remote-not-accessible' })
        }

        const targetRow = db.prepare('SELECT type, config FROM targets WHERE id = ?')
          .get(targetId) as { type: string; config: string } | undefined
        if (!targetRow || targetRow.type !== 'nas') {
          return reply.send({ passed: 0, failed: 0, missing: 0, note: 'remote-not-accessible' })
        }

        const { parseNasConfig } = await import('../execution/steps/nasTransfer.js')
        const nasConfig = await parseNasConfig(targetRow)
        if (!nasConfig) {
          return reply.send({ passed: 0, failed: 0, missing: 0, note: 'remote-not-accessible' })
        }

        try {
          return reply.send(await verifyRemoteChecksums(nasConfig, backupPath, checksums))
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          logger.warn(`Remote verification failed for ${backupPath}: ${msg}`)
          return reply.send({ passed: 0, failed: 0, missing: checksums.length, note: 'remote-ssh-failed' })
        }
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
