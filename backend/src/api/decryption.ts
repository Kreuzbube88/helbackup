import { type FastifyInstance } from 'fastify'
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

export async function decryptionRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: UnlockBody }>('/api/decryption/unlock', async (request, reply) => {
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

  app.post<{ Body: DecryptManifestBody }>('/api/decryption/manifest', async (request, reply) => {
    try {
      const { backupPath, sessionId } = request.body

      const password = encryptionSessions.getPassword(sessionId)
      if (!password) {
        return reply.status(401).send({ error: 'Invalid or expired session' })
      }

      const encryptedManifest = path.join(backupPath, 'manifest.json.gpg')
      const tempManifest = `/tmp/manifest-${Date.now()}.json`

      await decryptFileGPG(encryptedManifest, tempManifest, password)

      const manifestContent = await fs.readFile(tempManifest, 'utf-8')
      const manifest: unknown = JSON.parse(manifestContent)

      await fs.unlink(tempManifest)

      return reply.send(manifest)
    } catch (error: unknown) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })

  app.post<{ Body: DecryptArchiveBody }>('/api/decryption/archive', async (request, reply) => {
    try {
      const { backupPath, sessionId, outputDir } = request.body

      const password = encryptionSessions.getPassword(sessionId)
      if (!password) {
        return reply.status(401).send({ error: 'Invalid or expired session' })
      }

      const encryptedArchive = path.join(backupPath, 'backup-archive.tar.gz.gpg')
      const tempArchive = `/tmp/backup-${Date.now()}.tar.gz`

      await decryptFileGPG(encryptedArchive, tempArchive, password)
      await extractTarArchive(tempArchive, outputDir)
      await fs.unlink(tempArchive)

      return reply.send({ success: true, outputDir })
    } catch (error: unknown) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })
}
