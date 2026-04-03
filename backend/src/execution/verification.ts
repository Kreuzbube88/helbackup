import crypto from 'crypto'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import type { JobExecutionEngine } from './engine.js'

export interface ChecksumEntry {
  path: string
  checksum: string
  size: number
}

export function calculateFileChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = createReadStream(filePath)

    stream.on('data', (data: string | Buffer) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export async function generateChecksums(
  backupPath: string,
  engine: JobExecutionEngine
): Promise<ChecksumEntry[]> {
  engine.log('info', 'verification', 'Generating checksums for backup verification...')

  const checksums: ChecksumEntry[] = []

  async function processDir(dir: string): Promise<void> {
    const items = await fs.readdir(dir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = path.join(dir, item.name)
      const relativePath = path.relative(backupPath, fullPath)

      if (item.isDirectory()) {
        await processDir(fullPath)
      } else {
        try {
          const stats = await fs.stat(fullPath)
          const checksum = await calculateFileChecksum(fullPath)

          checksums.push({ path: relativePath, checksum, size: stats.size })
          engine.log('debug', 'verification', `Checksum: ${relativePath} (${checksum.slice(0, 8)}...)`)
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error)
          engine.log('warn', 'verification', `Failed to checksum ${relativePath}: ${msg}`)
        }
      }
    }
  }

  await processDir(backupPath)

  engine.log('info', 'verification', `Generated ${checksums.length} checksums`)
  return checksums
}

export interface VerificationResult {
  passed: number
  failed: number
  missing: number
}

export async function verifyChecksums(
  backupPath: string,
  expectedChecksums: ChecksumEntry[],
  engine: JobExecutionEngine
): Promise<VerificationResult> {
  engine.log('info', 'verification', 'Verifying backup checksums...')

  let passed = 0
  let failed = 0
  let missing = 0

  for (const entry of expectedChecksums) {
    const fullPath = path.join(backupPath, entry.path)

    try {
      const exists = await fs.access(fullPath).then(() => true).catch(() => false)

      if (!exists) {
        missing++
        engine.log('error', 'verification', `Missing file: ${entry.path}`, undefined, {
          error: { code: 'FILE_MISSING', suggestion: 'File was not backed up or has been deleted' }
        })
        continue
      }

      const actualChecksum = await calculateFileChecksum(fullPath)

      if (actualChecksum === entry.checksum) {
        passed++
      } else {
        failed++
        engine.log('error', 'verification', `Checksum mismatch: ${entry.path}`, undefined, {
          error: { code: 'CHECKSUM_MISMATCH', suggestion: 'File may be corrupted' }
        })
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      failed++
      engine.log('error', 'verification', `Verification error: ${entry.path} — ${msg}`)
    }
  }

  engine.log('info', 'verification',
    `Verification complete: ${passed} passed, ${failed} failed, ${missing} missing`
  )

  return { passed, failed, missing }
}
