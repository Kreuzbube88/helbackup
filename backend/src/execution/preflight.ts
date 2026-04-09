import { execFile } from 'child_process'
import { promisify } from 'util'
import { statfs } from 'fs/promises'

const execFileAsync = promisify(execFile)

export interface PreflightResult {
  passed: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Run Unraid pre-flight checks before a backup job starts.
 * Checks: array online, no parity/mover running, optional target free-space.
 *
 * @param targetPath  Host-side path of the backup destination (for free-space check).
 *                    Pass undefined to skip the disk-space check.
 * @param estimatedBytes  Expected transfer size in bytes (for free-space check).
 *                        Pass 0 or undefined to skip the disk-space check.
 */
export async function runPreflight(
  targetPath?: string,
  estimatedBytes?: number,
): Promise<PreflightResult> {
  const errors: string[] = []
  const warnings: string[] = []

  await checkArrayState(errors)
  await checkParityOrMover(errors, warnings)
  if (targetPath && estimatedBytes && estimatedBytes > 0) {
    await checkTargetSpace(targetPath, estimatedBytes, errors, warnings)
  }

  return { passed: errors.length === 0, errors, warnings }
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

async function checkArrayState(errors: string[]): Promise<void> {
  // /unraid/boot is the container-internal mount of /boot
  // mdState is persisted in /boot/config/disk.cfg on running arrays
  try {
    const { stdout } = await execFileAsync('sh', [
      '-c',
      // mdcmd status is available on Unraid; fall back to reading disk.cfg
      'mdcmd status 2>/dev/null | grep "^mdState=" || grep "^mdState=" /unraid/boot/config/disk.cfg 2>/dev/null || echo "mdState=UNKNOWN"',
    ])
    const match = /mdState=(\w+)/.exec(stdout.trim())
    const mdState = match ? match[1] : 'UNKNOWN'
    if (mdState !== 'STARTED') {
      errors.push(
        `Unraid array is not started (mdState=${mdState}). Start the array before running a backup.`,
      )
    }
  } catch {
    // If the command fails entirely we cannot determine state — warn, not error,
    // because the check may run outside an Unraid context (dev/test).
    warnings.push('Could not determine Unraid array state. Proceeding without array check.')
  }
}

async function checkParityOrMover(errors: string[], warnings: string[]): Promise<void> {
  // /proc/mdstat on the host is visible inside the container via the exec approach,
  // but we run inside the container where /proc/mdstat reflects the container's
  // namespaced view. Use mdcmd status or a direct grep of /proc/mdstat via sh -c.
  try {
    const { stdout } = await execFileAsync('sh', [
      '-c',
      'mdcmd status 2>/dev/null || echo ""',
    ])
    if (/mdResync=\d+/.test(stdout) && !/mdResync=0/.test(stdout)) {
      errors.push('Unraid parity check / array sync is running. Wait for it to finish before running a backup.')
    }
  } catch {
    // ignore — mdcmd not available in test environments
  }

  // Mover: check for a running mover PID
  try {
    const { stdout } = await execFileAsync('sh', [
      '-c',
      'pgrep -x mover 2>/dev/null && echo "RUNNING" || echo "STOPPED"',
    ])
    if (stdout.trim() === 'RUNNING') {
      warnings.push('Unraid mover is currently running. The backup will proceed, but performance may be degraded.')
    }
  } catch {
    // ignore
  }
}

async function checkTargetSpace(
  targetPath: string,
  estimatedBytes: number,
  errors: string[],
  warnings: string[],
): Promise<void> {
  try {
    const stats = await statfs(targetPath)
    const freeBytes = stats.bsize * stats.bavail

    if (freeBytes < estimatedBytes) {
      const freeMB = Math.round(freeBytes / 1024 / 1024)
      const needMB = Math.round(estimatedBytes / 1024 / 1024)
      errors.push(
        `Insufficient free space on target: ${freeMB} MB available, ${needMB} MB required.`,
      )
    } else if (freeBytes < estimatedBytes * 2) {
      const freeMB = Math.round(freeBytes / 1024 / 1024)
      const needMB = Math.round(estimatedBytes / 1024 / 1024)
      warnings.push(
        `Low free space on target: ${freeMB} MB available for ${needMB} MB backup. Consider running GFS cleanup.`,
      )
    }
  } catch {
    warnings.push(`Could not check free space on target path: ${targetPath}`)
  }
}
