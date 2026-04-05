import { readFile } from 'fs/promises'

let cached: string | null | undefined = undefined

/**
 * Returns the current container's own Docker container ID by reading /proc/self/cgroup.
 * Returns null if not running inside Docker or if parsing fails.
 * Result is cached after first call.
 */
export async function getSelfContainerId(): Promise<string | null> {
  if (cached !== undefined) return cached
  try {
    const cgroup = await readFile('/proc/self/cgroup', 'utf8')
    const match = cgroup.match(/\/docker\/([a-f0-9]{64})/)
    cached = match ? match[1] : null
  } catch {
    cached = null
  }
  return cached
}
