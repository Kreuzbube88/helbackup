import { logger } from './logger.js'

export function safeJsonParse<T = unknown>(
  json: string,
  context: string
): T | null {
  try {
    return JSON.parse(json) as T
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`JSON parse error in ${context}: ${msg}`)
    return null
  }
}

export function safeJsonParseOrThrow<T = unknown>(
  json: string,
  context: string
): T {
  try {
    return JSON.parse(json) as T
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Invalid JSON in ${context}: ${msg}`)
  }
}
