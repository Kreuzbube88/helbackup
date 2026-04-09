import { execFile } from 'child_process'
import { promisify } from 'util'
import { statfs } from 'fs/promises'

const execFileAsync = promisify(execFile)

export interface PreflightResult {
  passed: boolean
  errors: string[]
  warnings: string[]
}

/** Minimum free bytes required on a local target (500 MB hardcoded floor). */
const MIN_FREE_BYTES = 500 * 1024 * 1024

/**
 * Run pre-flight checks before a backup job starts.
 * Checks: no parity/mover running, local-target free-space.
 *
 * @param localTargetPaths  Host-side paths of local backup destinations.
 *                          Each is checked for a minimum of 500 MB free space.
 *                          Pass empty array or omit to skip the disk-space check.
 */
export async function runPreflight(
  localTargetPaths: string[] = [],
): Promise<PreflightResult> {
  const errors: string[] = []
  const warnings: string[] = []

  await checkParityOrMover(errors, warnings)
  for (const p of localTargetPaths) {
    await checkTargetSpace(p, MIN_FREE_BYTES, errors, warnings)
  }

  return { passed: errors.length === 0, errors, warnings }
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

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
  minFreeBytes: number,
  errors: string[],
  warnings: string[],
): Promise<void> {
  try {
    const stats = await statfs(targetPath)
    const freeBytes = stats.bsize * stats.bavail

    if (freeBytes < minFreeBytes) {
      const freeMB = Math.round(freeBytes / 1024 / 1024)
      const needMB = Math.round(minFreeBytes / 1024 / 1024)
      errors.push(
        `Insufficient free space on target path ${targetPath}: ${freeMB} MB available, minimum ${needMB} MB required.`,
      )
    } else if (freeBytes < minFreeBytes * 3) {
      const freeMB = Math.round(freeBytes / 1024 / 1024)
      warnings.push(
        `Low free space on target path ${targetPath}: ${freeMB} MB available. Consider running GFS cleanup.`,
      )
    }
  } catch {
    warnings.push(`Could not check free space on target path: ${targetPath}`)
  }
}
