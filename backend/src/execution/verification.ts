import crypto from 'crypto'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import { executeSSHCommand, type SSHConfig } from '../nas/ssh.js'
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

/**
 * Verify a backup that was just rsync'd to a remote NAS by running `sha256sum -c`
 * over SSH against the locally-computed checksum list. This is the primary defence
 * against silent transit corruption (rsync exit 0 with bad bytes on disk).
 *
 * Strategy:
 *  - Build a `sha256sum -c` input on stdin (no temp file on remote)
 *  - Run `cd <remotePath> && sha256sum -c -` (or `shasum -a 256 -c -` as fallback)
 *  - Use `|| true` so a verification failure doesn't trip executeSSHCommand's
 *    non-zero-exit error path — we want to parse the FAILED lines ourselves
 *  - If the remote has neither tool, log a warning and skip (non-fatal — the
 *    user can disable verification at the target level if their NAS lacks both)
 *
 * Throws when any file fails the hash check, so the caller (transferAndCleanup)
 * surfaces the failure to the engine which marks the run as failed and keeps
 * the local staging dir intact for re-run.
 */
export async function verifyRemoteChecksums(
  remotePath: string,
  expectedChecksums: ChecksumEntry[],
  ssh: SSHConfig,
  engine: JobExecutionEngine
): Promise<VerificationResult> {
  if (expectedChecksums.length === 0) {
    return { passed: 0, failed: 0, missing: 0 }
  }

  engine.log('info', 'verification',
    `Verifying ${expectedChecksums.length} files on remote ${ssh.host}:${remotePath}`
  )

  // sha256sum -c expects: "<hash>  <relative_path>" per line
  // Newline-terminated; binary mode is the default and correct here.
  const input = expectedChecksums
    .map(c => `${c.checksum}  ${c.path}`)
    .join('\n') + '\n'

  const escapedPath = remotePath.replace(/'/g, "'\\''")
  // Detect available hash tool, cd into remote, run check, swallow exit code so
  // we can parse FAILED lines from stdout. Anything we want the host to flag
  // gets prefixed with a unique sentinel (HBK_*) so we don't collide with file
  // names that legitimately contain words like "FAILED".
  const cmd = [
    'set +e',
    'if command -v sha256sum >/dev/null 2>&1; then HASH=sha256sum;',
    'elif command -v shasum >/dev/null 2>&1; then HASH="shasum -a 256";',
    'else echo HBK_NO_HASH_TOOL; exit 0; fi',
    `cd '${escapedPath}' || { echo HBK_NO_REMOTE_PATH; exit 0; }`,
    '$HASH -c - 2>&1 || true',
  ].join('; ')

  // Allow up to 1h for hashing — large appdata can take a while on slow NAS CPUs
  const result = await executeSSHCommand(ssh, cmd, { stdin: input, timeoutMs: 3_600_000 })

  if (!result.success) {
    throw new Error(`Remote verification command failed: ${result.error ?? 'unknown SSH error'}`)
  }

  const output = result.output ?? ''

  if (output.includes('HBK_NO_HASH_TOOL')) {
    engine.log('warn', 'verification',
      `Remote ${ssh.host} has no sha256sum/shasum — hash verification skipped. ` +
      `Install coreutils on the NAS for full integrity checks.`
    )
    return { passed: 0, failed: 0, missing: 0 }
  }

  if (output.includes('HBK_NO_REMOTE_PATH')) {
    throw new Error(`Remote verification failed: path '${remotePath}' does not exist on ${ssh.host}`)
  }

  // sha256sum -c output: "<file>: OK" per success line; "<file>: FAILED" or
  // "<file>: FAILED open or read" per failure. With no --quiet we get all lines.
  const lines = output.split('\n')
  const failedLines = lines.filter(l => /:\s*FAILED/.test(l))
  const failed = failedLines.length

  if (failed > 0) {
    // Surface up to 10 failed paths so users see exactly which files are bad
    for (const line of failedLines.slice(0, 10)) {
      engine.log('error', 'verification', `Remote checksum mismatch: ${line.trim()}`, undefined, {
        error: { code: 'CHECKSUM_MISMATCH', suggestion: 'File corrupted during transfer — re-run the backup' }
      })
    }
    if (failedLines.length > 10) {
      engine.log('error', 'verification', `...and ${failedLines.length - 10} more failed file(s)`)
    }
    throw new Error(`Remote verification failed: ${failed} of ${expectedChecksums.length} file(s) corrupted on ${ssh.host}`)
  }

  const passed = expectedChecksums.length
  engine.log('info', 'verification',
    `Remote verification passed: ${passed} files OK on ${ssh.host}`
  )
  return { passed, failed: 0, missing: 0 }
}
