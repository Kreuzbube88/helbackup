import { spawn } from 'node:child_process'
import { logger } from './logger.js'

export function createTarArchive(sourceDir: string, outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info(`Creating archive: ${outputFile} from ${sourceDir}`)

    const tar = spawn('tar', ['-czf', outputFile, '-C', sourceDir, '.'])

    let errorOutput = ''
    tar.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString()
    })

    tar.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info(`Archive created: ${outputFile}`)
        resolve()
      } else {
        logger.error(`Archive creation failed: ${errorOutput}`)
        reject(new Error(`tar failed with code ${code}`))
      }
    })

    tar.on('error', reject)
  })
}

export function extractTarArchive(archiveFile: string, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info(`Extracting archive: ${archiveFile} to ${outputDir}`)

    const tar = spawn('tar', ['-xzf', archiveFile, '-C', outputDir])

    let errorOutput = ''
    tar.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString()
    })

    tar.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info(`Archive extracted: ${outputDir}`)
        resolve()
      } else {
        logger.error(`Archive extraction failed: ${errorOutput}`)
        reject(new Error(`tar failed with code ${code}`))
      }
    })

    tar.on('error', reject)
  })
}
