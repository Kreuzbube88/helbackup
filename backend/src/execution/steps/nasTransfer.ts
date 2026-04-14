import path from 'path'
import fs from 'fs/promises'
import { execFile } from 'node:child_process'
import { executeRsync } from '../../tools/rsync.js'
import { executeSSHCommand } from '../../nas/ssh.js'
import { generateChecksums, verifyRemoteChecksums } from '../verification.js'
import type { ChecksumEntry } from '../verification.js'
import type { JobExecutionEngine } from '../engine.js'

export interface NasConfig {
  host: string
  port?: number
  username: string
  password?: string
  privateKey?: string  // absolute path to SSH private key file inside container (e.g. /app/config/ssh/nas_key)
  path: string
  /** Path to a known_hosts file for host-key pinning. When set, StrictHostKeyChecking=yes is used. */
  knownHostsFile?: string
}

export async function parseNasConfig(target: { type: string; config: string }): Promise<NasConfig | null> {
  if (target.type !== 'nas') return null
  let cfg: NasConfig
  try {
    cfg = JSON.parse(target.config) as NasConfig
  } catch {
    return null
  }
  // Auto-discover key: if no privateKey in config but the default key file exists, use it
  if (!cfg.privateKey) {
    const safeName = cfg.host.replace(/[^a-z0-9]/gi, '_')
    const defaultKey = `/app/config/ssh/nas_${safeName}`
    const keyExists = await fs.access(defaultKey).then(() => true).catch(() => false)
    if (keyExists) cfg = { ...cfg, privateKey: defaultKey }
  }
  // Auto-discover known_hosts: if no knownHostsFile but default exists, use it
  if (!cfg.knownHostsFile) {
    const safeName = cfg.host.replace(/[^a-z0-9]/gi, '_')
    const defaultKnownHosts = `/app/config/ssh/known_hosts_${safeName}`
    const exists = await fs.access(defaultKnownHosts).then(() => true).catch(() => false)
    if (exists) cfg = { ...cfg, knownHostsFile: defaultKnownHosts }
  }
  return cfg
}

export async function createNasTempDir(prefix: string): Promise<string> {
  const stagingBase = '/app/data/staging'
  await fs.mkdir(stagingBase, { recursive: true })
  return fs.mkdtemp(path.join(stagingBase, `helbackup-${prefix}-`))
}

/**
 * Atomically publish a local staging dir to the final destination.
 * Uses a rename (same filesystem → atomic on POSIX). If destPath already exists
 * (same-day re-run), it is removed first so the rename succeeds.
 */
export async function finalizeLocalBackup(
  workDir: string,
  destPath: string,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', `Publishing backup: ${workDir} → ${destPath}`)
  try {
    let destExists = false
    try { await fs.stat(destPath); destExists = true } catch { /* new directory */ }

    if (destExists) {
      // Same-day run from a different job — merge contents rather than replacing,
      // so both jobs' data coexist in the same date directory.
      engine.log('info', 'system', 'Destination exists — merging into existing backup directory')
      await fs.cp(workDir, destPath, { recursive: true })
      // Use rm -rf — fs.rm recursive is unreliable on FUSE/shfs
      await new Promise<void>((resolve, reject) =>
        execFile('rm', ['-rf', workDir], err => err ? reject(err) : resolve())
      )
    } else {
      // Fast path: atomic rename (single filesystem operation)
      await fs.rename(workDir, destPath)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Atomic backup publish failed (${workDir} → ${destPath}): ${msg}`)
  }
  engine.log('info', 'system', 'Backup committed to destination')
}

export async function transferAndCleanup(
  localDir: string,
  remotePath: string,
  nasConfig: NasConfig,
  engine: JobExecutionEngine
): Promise<ChecksumEntry[]> {
  engine.log('info', 'system', `Transferring to NAS: ${nasConfig.host}:${remotePath}`)

  const sshCfg = {
    host: nasConfig.host,
    port: nasConfig.port,
    username: nasConfig.username,
    password: nasConfig.password,
    privateKey: nasConfig.privateKey,
  }

  // Use a .partial staging dir on the NAS so an interrupted transfer never
  // leaves a seemingly-complete backup dir without a manifest.
  // Only after verification succeeds do we rename .partial → final.
  const partialPath = `${remotePath}.partial`
  const escFinal  = remotePath.replace(/'/g, "'\\''")
  const escPartial = partialPath.replace(/'/g, "'\\''")

  // Clean up any leftover partial from a previous failed run, then create fresh
  const mkdirResult = await executeSSHCommand(
    sshCfg,
    `rm -rf '${escPartial}' && mkdir -p '${escPartial}'`
  )
  if (!mkdirResult.success) {
    throw new Error(`Failed to prepare remote staging dir ${partialPath}: ${mkdirResult.error ?? 'unknown error'}`)
  }

  // Generate checksums BEFORE transfer so we have a known-good source-of-truth.
  // After rsync we re-hash on the remote and compare — that catches transit corruption.
  const checksums = await generateChecksums(localDir, engine)

  try {
    await executeRsync({
      source: localDir + '/',
      destination: partialPath,
      sshHost: nasConfig.host,
      sshUser: nasConfig.username,
      sshPassword: nasConfig.password,
      sshKey: nasConfig.privateKey,
      sshPort: nasConfig.port,
      knownHostsFile: nasConfig.knownHostsFile,
      // Source is our own staged temp dir — vanished/unreadable files indicate a real problem
      strict: true,
      onProgress: (() => {
        let last = -1
        return ({ percent, speed }: { percent: number; speed: string }) => {
          if (percent < last) last = -1  // new file started — reset throttle
          if (Math.floor(percent / 10) > Math.floor(last / 10)) {
            last = percent
            engine.log('info', 'system', `Transfer: ${percent}% — ${speed}`)
          }
        }
      })(),
      onLog: msg => {
        const line = msg.trim()
        if (!line.startsWith('ERROR:')) return
        const content = line.replace(/^ERROR:\s*/, '')
        // SSH informational warnings — not actual errors
        if (content.startsWith('Warning:') || content.startsWith('** WARNING:')) return
        engine.log('error', 'system', content)
      },
    })

    // Verify the bytes that landed in the partial dir on the NAS match what we
    // hashed locally. Throws on mismatch — local dir is preserved for re-run.
    await verifyRemoteChecksums(partialPath, checksums, sshCfg, engine)

    // Atomically promote .partial → final (rm old same-day dir first if present)
    const publishResult = await executeSSHCommand(
      sshCfg,
      `rm -rf '${escFinal}' && mv '${escPartial}' '${escFinal}'`
    )
    if (!publishResult.success) {
      throw new Error(`Failed to publish remote backup (rename .partial → final): ${publishResult.error ?? 'unknown error'}`)
    }
  } finally {
    // Always clean up the local staging dir — whether transfer succeeded or failed
    await new Promise<void>(resolve =>
      execFile('rm', ['-rf', localDir], () => resolve())
    )
  }

  engine.log('info', 'system', 'NAS transfer complete (verified + committed)')
  return checksums
}
