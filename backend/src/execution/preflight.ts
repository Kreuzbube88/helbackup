import { statfs } from 'fs/promises'

export interface PreflightResult {
  passed: boolean
  errors: string[]
  warnings: string[]
}

/** Minimum free bytes required on a local target (500 MB hardcoded floor). */
const MIN_FREE_BYTES = 500 * 1024 * 1024

/**
 * Run pre-flight checks before a backup job starts.
 * Checks: local-target free-space.
 *
 * Note: parity/mover and array-state checks are not possible — the container
 * runs in its own PID namespace and has no access to Unraid host processes.
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

  for (const p of localTargetPaths) {
    await checkTargetSpace(p, MIN_FREE_BYTES, errors, warnings)
  }

  return { passed: errors.length === 0, errors, warnings }
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
