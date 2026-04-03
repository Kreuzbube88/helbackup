import { spawn } from 'child_process'
import { stat } from 'node:fs/promises'
import { logger } from '../utils/logger.js'

export interface TarOptions {
  source: string
  destination: string
  compress?: boolean // default true
  onProgress?: (data: { currentFile: string; filesProcessed: number }) => void
  onLog?: (message: string) => void
}

export interface TarResult {
  success: boolean
  filesProcessed: number
  archiveSize: number
  error?: string
}

export async function createTarArchive(options: TarOptions): Promise<TarResult> {
  return new Promise((resolve, reject) => {
    const compress = options.compress !== false
    const sourceDir = options.source.substring(0, options.source.lastIndexOf('/'))
    const sourceName = options.source.substring(options.source.lastIndexOf('/') + 1)

    const args = [
      compress ? '-czv' : '-cv',
      '-f', options.destination,
      '-C', sourceDir,
      sourceName,
    ]

    logger.info(`Creating tar archive: tar ${args.join(' ')}`)

    const tar = spawn('tar', args)
    let filesProcessed = 0

    tar.stdout.on('data', (data: Buffer) => {
      const output = data.toString()
      if (options.onLog) options.onLog(output)

      const lines = output.split('\n').filter(Boolean)
      lines.forEach(line => {
        filesProcessed++
        if (options.onProgress) {
          options.onProgress({ currentFile: line.trim(), filesProcessed })
        }
      })
    })

    tar.stderr.on('data', (data: Buffer) => {
      const error = data.toString()
      logger.error(`Tar stderr: ${error}`)
      if (options.onLog) options.onLog(`ERROR: ${error}`)
    })

    tar.on('close', (code: number | null) => {
      if (code === 0) {
        stat(options.destination)
          .then(stats => {
            logger.info(`Tar archive created: ${options.destination} (${stats.size} bytes)`)
            resolve({ success: true, filesProcessed, archiveSize: stats.size })
          })
          .catch(err => reject(err))
      } else {
        const error = `Tar failed with exit code ${code}`
        logger.error(error)
        reject(new Error(error))
      }
    })

    tar.on('error', (error: Error) => {
      logger.error(`Tar spawn error: ${error.message}`)
      reject(error)
    })
  })
}

export async function extractTarArchive(archivePath: string, destination: string): Promise<TarResult> {
  return new Promise((resolve, reject) => {
    const args = ['-xzv', '-f', archivePath, '-C', destination]

    logger.info(`Extracting tar archive: tar ${args.join(' ')}`)

    const tar = spawn('tar', args)
    let filesProcessed = 0

    tar.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean)
      filesProcessed += lines.length
    })

    tar.stderr.on('data', (data: Buffer) => {
      logger.error(`Tar stderr: ${data.toString()}`)
    })

    tar.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info(`Tar extraction completed: ${filesProcessed} files`)
        resolve({ success: true, filesProcessed, archiveSize: 0 })
      } else {
        const error = `Tar extraction failed with exit code ${code}`
        logger.error(error)
        reject(new Error(error))
      }
    })

    tar.on('error', (error: Error) => {
      logger.error(`Tar spawn error: ${error.message}`)
      reject(error)
    })
  })
}
