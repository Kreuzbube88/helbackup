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
 * Run Unraid pre-flight checks before a backup job starts.
 * Checks: array online, no parity/mover running, local-target free-space.
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

  await checkArrayState(errors)
  await checkParityOrMover(errors, warnings)
  for (const p of localTargetPaths) {
    await checkTargetSpace(p, MIN_FREE_BYTES, errors, warnings)
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
