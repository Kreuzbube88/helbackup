import { spawn } from 'child_process'
import { logger } from '../utils/logger.js'

export interface RsyncOptions {
  source: string
  destination: string
  sshUser?: string
  sshHost?: string
  sshKey?: string
  excludePatterns?: string[]
  filesFrom?: string // path to a file containing newline-separated relative paths to include
  bwLimit?: number // KB/s
  onProgress?: (data: { percent: number; transferred: string; speed: string }) => void
  onLog?: (message: string) => void
}

export interface RsyncResult {
  success: boolean
  bytesTransferred: number
  error?: string
}

export async function executeRsync(options: RsyncOptions): Promise<RsyncResult> {
  return new Promise((resolve, reject) => {
    const args: string[] = ['-av', '--progress', '--stats']

    if (options.bwLimit) {
      args.push(`--bwlimit=${options.bwLimit}`)
    }

    if (options.excludePatterns) {
      options.excludePatterns.forEach(pattern => {
        args.push(`--exclude=${pattern}`)
      })
    }

    if (options.filesFrom) {
      args.push(`--files-from=${options.filesFrom}`)
    }

    if (options.sshHost && options.sshUser) {
      // Quote the key path to handle spaces; single-quote escaping is safe here
      // because key paths are filesystem paths validated before reaching this point
      const sshCmd = options.sshKey
        ? `ssh -i '${options.sshKey.replace(/'/g, "'\\''")}' -o StrictHostKeyChecking=no`
        : `ssh -o StrictHostKeyChecking=no`
      args.push(`--rsh=${sshCmd}`)
      args.push(options.source, `${options.sshUser}@${options.sshHost}:${options.destination}`)
    } else {
      args.push(options.source, options.destination)
    }

    logger.info(`Executing rsync: rsync ${args.join(' ')}`)

    const rsync = spawn('rsync', args)
    let bytesTransferred = 0
    let lastOutput = ''

    rsync.stdout.on('data', (data: Buffer) => {
      const output = data.toString()
      lastOutput += output

      if (options.onLog) options.onLog(output)

      // "  1,234,567  45%  123.45kB/s    0:00:12"
      const progressMatch = output.match(/(\d[\d,]*)\s+(\d+)%\s+([\d.]+[kMG]B\/s)/)
      if (progressMatch && options.onProgress) {
        options.onProgress({
          transferred: progressMatch[1],
          percent: parseInt(progressMatch[2]),
          speed: progressMatch[3],
        })
      }
    })

    rsync.stderr.on('data', (data: Buffer) => {
      const error = data.toString()
      logger.error(`Rsync stderr: ${error}`)
      if (options.onLog) options.onLog(`ERROR: ${error}`)
    })

    rsync.on('close', (code: number | null) => {
      if (code === 0) {
        const statsMatch = lastOutput.match(/Total transferred file size: ([\d,]+) bytes/)
        if (statsMatch) bytesTransferred = parseInt(statsMatch[1].replace(/,/g, ''))
        logger.info(`Rsync completed. Transferred: ${bytesTransferred} bytes`)
        resolve({ success: true, bytesTransferred })
      } else {
        const error = `Rsync failed with exit code ${code}`
        logger.error(error)
        reject(new Error(error))
      }
    })

    rsync.on('error', (error: Error) => {
      logger.error(`Rsync spawn error: ${error.message}`)
      reject(error)
    })
  })
}
