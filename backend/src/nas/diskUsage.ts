import { db } from '../db/database.js'
import { executeSSHCommand } from './ssh.js'
import { logger } from '../utils/logger.js'
import type { TargetRow } from '../types/rows.js'

export async function checkAndStoreDiskUsage(targetId: string): Promise<void> {
  try {
    const row = db.prepare('SELECT type, config FROM targets WHERE id = ?').get(targetId) as Pick<TargetRow, 'type' | 'config'> | undefined
    if (!row || row.type !== 'nas') return

    let cfg: Record<string, unknown>
    try { cfg = JSON.parse(row.config) as Record<string, unknown> } catch { return }

    const remotePath = cfg['path'] as string | undefined
    if (!remotePath || typeof remotePath !== 'string') return

    const sshConfig = {
      host: cfg['host'] as string,
      port: cfg['port'] as number | undefined,
      username: cfg['username'] as string,
      password: cfg['password'] as string | undefined,
      privateKey: cfg['privateKey'] as string | undefined,
    }
    if (!sshConfig.host || !sshConfig.username) return

    const result = await executeSSHCommand(sshConfig, `df -B1 ${remotePath}`, { timeoutMs: 10_000 })
    if (!result.success || !result.output) return

    // df -B1 output: header on line 0, data on line 1
    // Filesystem 1B-blocks Used Available Use% Mounted
    const parts = (result.output.split('\n')[1] ?? '').trim().split(/\s+/).filter(Boolean)
    const total = parseInt(parts[1] ?? '0', 10)
    const used = parseInt(parts[2] ?? '0', 10)
    const available = parseInt(parts[3] ?? '0', 10)

    if (!total || total <= 0) return

    db.prepare(`
      INSERT OR REPLACE INTO target_disk_usage (target_id, total_bytes, used_bytes, available_bytes, checked_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(targetId, total, used, available)
  } catch (err) {
    logger.debug({ targetId, err: err instanceof Error ? err.message : String(err) }, 'disk usage check failed (non-critical)')
  }
}
