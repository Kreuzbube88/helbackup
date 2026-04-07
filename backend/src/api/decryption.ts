import { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import fs from 'fs/promises'
import path from 'path'
import { verifyEncryptionPassword } from '../utils/encryptionKey.js'
import { encryptionSessions } from '../utils/encryptionSessions.js'
import { decryptFileGPG } from '../utils/gpgEncrypt.js'
import { extractTarArchive } from '../utils/archiveManager.js'

interface UnlockBody {
  backupId: string
  password: string
}

interface DecryptManifestBody {
  backupPath: string
  sessionId: string
}

interface DecryptArchiveBody {
  backupPath: string
  sessionId: string
  outputDir: string
}

const ALLOWED_PATH_BASES = ['/app/', '/unraid/', '/mnt/']

function isSafePath(p: string): boolean {
  if (!path.isAbsolute(p)) return false
  const resolved = path.resolve(p)
  return ALLOWED_PATH_BASES.some(base => resolved.startsWith(base))
}

export async function decryptionRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: UnlockBody }>('/api/decryption/unlock', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { backupId, password } = request.body

      const valid = await verifyEncryptionPassword(password)
      if (!valid) {
        return reply.status(401).send({ error: 'Invalid encryption password' })
      }

      const sessionId = encryptionSessions.createSession(backupId, password)

      return reply.send({ success: true, sessionId, expiresIn: 30 * 60 })
    } catch (error: unknown) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })

  app.post<{ Body: DecryptManifestBody }>('/api/decryption/manifest', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { backupPath, sessionId } = request.body

      if (!isSafePath(backupPath)) {
        return reply.status(400).send({ error: 'Invalid backup path' })
      }

      const password = encryptionSessions.getPassword(sessionId)
      if (!password) {
        return reply.status(401).send({ error: 'Invalid or expired session' })
      }

      const encryptedManifest = path.join(backupPath, 'manifest.json.gpg')
      const tempManifest = `/tmp/manifest-${randomUUID()}.json`

      try {
        await decryptFileGPG(encryptedManifest, tempManifest, password)
        const manifestContent = await fs.readFile(tempManifest, 'utf-8')
        const manifest: unknown = JSON.parse(manifestContent)
        return reply.send(manifest)
      } finally {
        await fs.unlink(tempManifest).catch(() => { /* already gone */ })
      }
    } catch (error: unknown) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })

  app.post<{ Body: DecryptArchiveBody }>('/api/decryption/archive', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { backupPath, sessionId, outputDir } = request.body

      if (!isSafePath(backupPath)) {
        return reply.status(400).send({ error: 'Invalid backup path' })
      }
      if (!isSafePath(outputDir)) {
        return reply.status(400).send({ error: 'Invalid output directory' })
      }

      const password = encryptionSessions.getPassword(sessionId)
      if (!password) {
        return reply.status(401).send({ error: 'Invalid or expired session' })
      }

      const encryptedArchive = path.join(backupPath, 'backup-archive.tar.gz.gpg')
      const tempArchive = `/tmp/backup-${randomUUID()}.tar.gz`

      try {
        await decryptFileGPG(encryptedArchive, tempArchive, password)
        await extractTarArchive(tempArchive, outputDir)
        return reply.send({ success: true, outputDir })
      } finally {
        await fs.unlink(tempArchive).catch(() => { /* already gone */ })
      }
    } catch (error: unknown) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })
}
