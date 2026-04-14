import { type FastifyInstance } from 'fastify'
import { db } from '../db/database.js'
import { decryptFileGPG } from '../utils/gpgEncrypt.js'
import { logger } from '../utils/logger.js'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { spawn } from 'child_process'

const DB_PATH = process.env.DB_PATH ?? '/app/data/helbackup.db'

export default async function helbackupRoutes(app: FastifyInstance) {
  // POST /api/helbackup/restore
  // Accepts base64-encoded helbackup-export.tar.gz (or .tar.gz.gpg)
  // Restores DB + SSH keys, then restarts the container via process.exit(0)
  app.post<{ Body: { fileData: string; encryptionPassword?: string } }>(
    '/api/helbackup/restore',
    {
      preHandler: [app.authenticate],
      // 50MB limit — default Fastify limit is 1MB
      bodyLimit: 50 * 1024 * 1024,
      schema: {
        body: {
          type: 'object',
          required: ['fileData'],
          properties: {
            fileData: { type: 'string' },
            encryptionPassword: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { fileData, encryptionPassword } = request.body
      const restoreId = randomUUID()
      const tmpDir = path.join('/app/data/staging', `helbackup-restore-${restoreId}`)

      try {
        await fs.mkdir(tmpDir, { recursive: true })

        // Decode base64 → detect format by checking gzip magic bytes
        const buffer = Buffer.from(fileData, 'base64')
        const isGpg = buffer[0] !== 0x1f || buffer[1] !== 0x8b  // gzip magic: 0x1f 0x8b
        const archivePath = path.join(tmpDir, isGpg ? 'backup.tar.gz.gpg' : 'backup.tar.gz')
        await fs.writeFile(archivePath, buffer)

        let extractFrom = archivePath

        if (isGpg) {
          if (!encryptionPassword) {
            await fs.rm(tmpDir, { recursive: true, force: true })
            return reply.status(400).send({ error: 'Backup is encrypted — encryptionPassword required' })
          }
          const decryptedPath = path.join(tmpDir, 'backup.tar.gz')
          await decryptFileGPG(archivePath, decryptedPath, encryptionPassword)
          extractFrom = decryptedPath
        }

        // Extract
        const extractDir = path.join(tmpDir, 'extracted')
        await fs.mkdir(extractDir, { recursive: true })
        await runCommand('tar', ['-xzf', extractFrom, '-C', extractDir])

        // Validate
        const dbSrc = path.join(extractDir, 'helbackup.db')
        const metaSrc = path.join(extractDir, 'metadata.json')
        await fs.access(dbSrc).catch(() => { throw new Error('Invalid backup: missing helbackup.db') })
        await fs.access(metaSrc).catch(() => { throw new Error('Invalid backup: missing metadata.json') })

        // Stage DB as .pending so we can do the rename atomically after reply
        await fs.copyFile(dbSrc, `${DB_PATH}.pending`)

        // Restore SSH keys
        const sshSrc = path.join(extractDir, 'ssh')
        const sshDest = '/app/config/ssh'
        const hasSsh = await fs.access(sshSrc).then(() => true).catch(() => false)
        if (hasSsh) {
          await fs.mkdir(sshDest, { recursive: true })
          await fs.cp(sshSrc, sshDest, { recursive: true })
        }

        logger.info('[helbackup/restore] Restore staged — restarting container')
        await reply.send({ ok: true, message: 'Restore complete — container is restarting' })

        // After response: swap DB file and restart
        setTimeout(() => {
          fs.rename(`${DB_PATH}.pending`, DB_PATH)
            .catch(err => logger.error(`[helbackup/restore] rename failed: ${err}`))
            .finally(() => {
              try { db.close() } catch { /* ignore */ }
              fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined)
              process.exit(0)
            })
        }, 500)

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(`[helbackup/restore] ${msg}`)
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined)
        return reply.status(500).send({ error: msg })
      }
    }
  )
}

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args)
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} failed with code ${code}: ${stderr.trim()}`))
    })
    proc.on('error', reject)
  })
}
