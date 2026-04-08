import { spawn } from 'child_process'
import { logger } from '../utils/logger.js'

export interface RsyncOptions {
  source: string
  destination: string
  sshUser?: string
  sshHost?: string
  sshKey?: string
  sshPassword?: string
  sshPort?: number
  excludePatterns?: string[]
  filesFrom?: string // path to a file containing newline-separated relative paths to include
  bwLimit?: number // KB/s
  onProgress?: (data: { percent: number; transferred: string; speed: string }) => void
  onLog?: (message: string) => void
}

export interface RsyncResult {
  success: boolean
  bytesTransferred: number
  filesTransferred: number
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
      args.push('--mkpath') // create remote destination directory if it does not exist (rsync >= 3.2.3)
      const portFlag = options.sshPort && options.sshPort !== 22 ? ` -p ${options.sshPort}` : ''
      // Prefer key auth over password — key takes priority if both are configured
      const sshCmd = options.sshKey
        ? `ssh${portFlag} -i '${options.sshKey.replace(/'/g, "'\\''")}' -o StrictHostKeyChecking=no -o BatchMode=yes -o PasswordAuthentication=no`
        : options.sshPassword
          ? `sshpass -e ssh${portFlag} -o StrictHostKeyChecking=no`
          : `ssh${portFlag} -o StrictHostKeyChecking=no`
      args.push(`--rsh=${sshCmd}`)
      args.push(options.source, `${options.sshUser}@${options.sshHost}:${options.destination}`)
    } else {
      args.push(options.source, options.destination)
    }

    // Redact SSH key path from log output
    const sanitizedArgs = args.map(a => a.replace(/-i '[^']*'/, "-i '***'"))
    logger.info(`Executing rsync: rsync ${sanitizedArgs.join(' ')}`)

    const spawnEnv = options.sshPassword ? { ...process.env, SSHPASS: options.sshPassword } : process.env
    const rsync = spawn('rsync', args, { env: spawnEnv })
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
      // 0 = success, 23 = partial transfer (some files unreadable), 24 = vanished files — treat as warnings
      if (code === 0 || code === 23 || code === 24) {
        const statsMatch = lastOutput.match(/Total transferred file size: ([\d,]+) bytes/)
        if (statsMatch) bytesTransferred = parseInt(statsMatch[1].replace(/,/g, ''))
        const filesMatch = lastOutput.match(/Number of regular files transferred: ([\d,]+)/)
        const filesTransferred = filesMatch ? parseInt(filesMatch[1].replace(/,/g, '')) : 0
        if (code !== 0) logger.warn(`Rsync completed with warnings (exit ${code}). Transferred: ${bytesTransferred} bytes`)
        else logger.info(`Rsync completed. Transferred: ${bytesTransferred} bytes, ${filesTransferred} files`)
        resolve({ success: true, bytesTransferred, filesTransferred })
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
