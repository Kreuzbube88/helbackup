import { spawn } from 'child_process'
import { logger } from '../utils/logger.js'

export interface RcloneOptions {
  source: string
  destination: string
  remote: string // e.g. "b2:bucket-name"
  configPath?: string
  bwLimit?: number // KB/s
  onProgress?: (data: { percent: number; transferred: string; speed: string; eta: string }) => void
  onLog?: (message: string) => void
}

export interface RcloneResult {
  success: boolean
  bytesTransferred: number
  error?: string
}

export async function executeRclone(options: RcloneOptions): Promise<RcloneResult> {
  return new Promise((resolve, reject) => {
    const args = [
      'copy',
      options.source,
      `${options.remote}/${options.destination}`,
      '--progress',
      '--stats', '1s',
      '--stats-one-line',
    ]

    if (options.configPath) args.push(`--config=${options.configPath}`)
    if (options.bwLimit) args.push(`--bwlimit=${options.bwLimit}K`)

    logger.info(`Executing rclone: rclone ${args.join(' ')}`)

    const rclone = spawn('rclone', args)
    let bytesTransferred = 0

    rclone.stdout.on('data', (data: Buffer) => {
      const output = data.toString()
      if (options.onLog) options.onLog(output)
    })

    // Rclone sends progress/stats to stderr
    rclone.stderr.on('data', (data: Buffer) => {
      const output = data.toString()
      if (options.onLog) options.onLog(output)

      // "Transferred:   1.234 MiB / 10.000 MiB, 12%, 123.45 KiB/s, ETA 1m23s"
      const progressMatch = output.match(
        /Transferred:\s+([\d.]+\s+\w+)\s+\/\s+[\d.]+\s+\w+,\s+(\d+)%,\s+([\d.]+\s+\w+\/s),\s+ETA\s+([\w\d]+)/
      )
      if (progressMatch) {
        if (options.onProgress) {
          options.onProgress({
            transferred: progressMatch[1],
            percent: parseInt(progressMatch[2]),
            speed: progressMatch[3],
            eta: progressMatch[4],
          })
        }
        const sizeMatch = progressMatch[1].match(/([\d.]+)\s+(\w+)/)
        if (sizeMatch) {
          const value = parseFloat(sizeMatch[1])
          const units: Record<string, number> = { B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 }
          bytesTransferred = Math.round(value * (units[sizeMatch[2]] ?? 1))
        }
      }
    })

    rclone.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info('Rclone completed successfully')
        resolve({ success: true, bytesTransferred })
      } else {
        const error = `Rclone failed with exit code ${code}`
        logger.error(error)
        reject(new Error(error))
      }
    })

    rclone.on('error', (error: Error) => {
      logger.error(`Rclone spawn error: ${error.message}`)
      reject(error)
    })
  })
}

export async function testRcloneRemote(remote: string, configPath?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = ['lsd', `${remote}:`]
    if (configPath) args.push(`--config=${configPath}`)

    const rclone = spawn('rclone', args)

    rclone.on('close', (code: number | null) => resolve(code === 0))
    rclone.on('error', () => resolve(false))
  })
}
