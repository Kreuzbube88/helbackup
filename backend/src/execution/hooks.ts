import { spawn } from 'child_process'
import { access, constants } from 'node:fs/promises'
import path from 'node:path'
import { logger } from '../utils/logger.js'

const ALLOWED_HOOK_DIRS = ['/app/config/hooks', '/app/data/hooks']

export interface HookResult {
  success: boolean
  output: string
}

export async function executeHook(
  scriptPath: string,
  type: 'pre' | 'post',
  context: Record<string, string>
): Promise<HookResult> {
  const resolved = path.resolve(scriptPath)
  if (!ALLOWED_HOOK_DIRS.some(dir => resolved.startsWith(dir + '/'))) {
    const message = `Hook path not allowed: ${resolved} — scripts must be inside ${ALLOWED_HOOK_DIRS.join(' or ')}`
    logger.error(message)
    return { success: false, output: message }
  }

  try {
    await access(resolved, constants.F_OK)
  } catch {
    const message = `Hook script not found: ${resolved}`
    logger.error(message)
    return { success: false, output: message }
  }
  try {
    await access(resolved, constants.X_OK)
  } catch {
    const message = `Hook script is not executable: ${resolved} — run chmod +x`
    logger.error(message)
    return { success: false, output: message }
  }

  return new Promise((resolve) => {
    logger.info(`Executing ${type}-backup hook: ${scriptPath}`)

    const env: NodeJS.ProcessEnv = { ...process.env, ...context }
    const proc = spawn(scriptPath, [], { env })

    let output = ''

    proc.stdout.on('data', (data: Buffer) => { output += data.toString() })
    proc.stderr.on('data', (data: Buffer) => { output += data.toString() })

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info(`Hook ${type}-backup completed successfully`)
        resolve({ success: true, output })
      } else if (code === 2) {
        // Exit code 2 signals: skip this backup
        logger.warn(`Hook ${type}-backup returned 2 — skipping backup`)
        resolve({ success: false, output })
      } else {
        logger.error(`Hook ${type}-backup failed with code ${code}`)
        resolve({ success: false, output })
      }
    })

    proc.on('error', (error: NodeJS.ErrnoException) => {
      // ENOENT here means the interpreter is missing — the script itself was verified above
      const hint = error.code === 'ENOENT'
        ? ' — check the shebang line (interpreter not found)'
        : ''
      logger.error(`Hook ${type}-backup error: ${error.message}${hint}`)
      resolve({ success: false, output: `${error.message}${hint}` })
    })
  })
}
