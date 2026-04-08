import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import { executeRsync } from '../../tools/rsync.js'
import type { JobExecutionEngine } from '../engine.js'

export interface NasConfig {
  host: string
  port?: number
  username: string
  password?: string
  path: string
}

export function parseNasConfig(target: { type: string; config: string }): NasConfig | null {
  if (target.type !== 'nas') return null
  try {
    return JSON.parse(target.config) as NasConfig
  } catch {
    return null
  }
}

export async function createNasTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), `helbackup-${prefix}-`))
}

export async function transferAndCleanup(
  localDir: string,
  remotePath: string,
  nasConfig: NasConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', `Transferring to NAS: ${nasConfig.host}:${remotePath}`)
  await executeRsync({
    source: localDir + '/',
    destination: remotePath,
    sshHost: nasConfig.host,
    sshUser: nasConfig.username,
    sshPassword: nasConfig.password,
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
      if (line) engine.log('error', 'system', `rsync: ${line}`)
    },
  })
  await fs.rm(localDir, { recursive: true, force: true })
  engine.log('info', 'system', 'NAS transfer complete')
}
