import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import { executeRsync } from '../../tools/rsync.js'
import { executeSSHCommand } from '../../nas/ssh.js'
import { generateChecksums } from '../verification.js'
import type { ChecksumEntry } from '../verification.js'
import type { JobExecutionEngine } from '../engine.js'

export interface NasConfig {
  host: string
  port?: number
  username: string
  password?: string
  privateKey?: string  // absolute path to SSH private key file inside container (e.g. /app/config/ssh/nas_key)
  path: string
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
  return cfg
}

export async function createNasTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), `helbackup-${prefix}-`))
}

export async function transferAndCleanup(
  localDir: string,
  remotePath: string,
  nasConfig: NasConfig,
  engine: JobExecutionEngine
): Promise<ChecksumEntry[]> {
  engine.log('info', 'system', `Transferring to NAS: ${nasConfig.host}:${remotePath}`)
  // Pre-create remote directory via SSH (avoids --mkpath which requires rsync 3.2.3+, not available on Synology DSM)
  const mkdirResult = await executeSSHCommand(
    { host: nasConfig.host, port: nasConfig.port, username: nasConfig.username, password: nasConfig.password, privateKey: nasConfig.privateKey },
    `mkdir -p '${remotePath.replace(/'/g, "'\\''")}'`
  )
  if (!mkdirResult.success) {
    throw new Error(`Failed to create remote directory ${remotePath}: ${mkdirResult.error ?? 'unknown error'}`)
  }
  await executeRsync({
    source: localDir + '/',
    destination: remotePath,
    sshHost: nasConfig.host,
    sshUser: nasConfig.username,
    sshPassword: nasConfig.password,
    sshKey: nasConfig.privateKey,
    sshPort: nasConfig.port,
    bwLimit: 51200,
    onProgress: (() => {
      let last = -1
      return ({ percent, speed }: { percent: number; speed: string }) => {
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
  const checksums = await generateChecksums(localDir, engine)
  await fs.rm(localDir, { recursive: true, force: true })
  engine.log('info', 'system', 'NAS transfer complete')
  return checksums
}
