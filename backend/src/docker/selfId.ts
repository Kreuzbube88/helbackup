import { readFile } from 'fs/promises'
import { hostname } from 'os'

let cached: string | null | undefined = undefined

/**
 * Returns the current container's own Docker container ID.
 * Tries cgroup v1, then cgroup v2 via mountinfo, then falls back to hostname.
 * Result is cached after first call.
 */
export async function getSelfContainerId(): Promise<string | null> {
  if (cached !== undefined) return cached
  try {
    // cgroup v1
    const cgroup = await readFile('/proc/self/cgroup', 'utf8')
    const match = cgroup.match(/\/docker\/([a-f0-9]{64})/)
    if (match) {
      cached = match[1]
      return cached
    }

    // cgroup v2: check mountinfo for container ID
    try {
      const mountinfo = await readFile('/proc/self/mountinfo', 'utf8')
      const mountMatch = mountinfo.match(/\/docker\/containers\/([a-f0-9]{64})/)
      if (mountMatch) {
        cached = mountMatch[1]
        return cached
      }
    } catch { /* mountinfo not available */ }

    // Fallback: Docker sets hostname to short container ID
    const host = hostname()
    if (/^[a-f0-9]{12}$/.test(host)) {
      cached = host
      return cached
    }

    cached = null
  } catch {
    cached = null
  }
  return cached
}
