import { spawn } from 'node:child_process'
import { logger } from './logger.js'

export function encryptFileGPG(
  inputPath: string,
  outputPath: string,
  password: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info(`GPG encrypting: ${inputPath} → ${outputPath}`)

    const gpg = spawn('gpg', [
      '--symmetric',
      '--cipher-algo', 'AES256',
      '--batch',
      '--yes',
      '--passphrase-fd', '0',
      '--output', outputPath,
      inputPath,
    ])

    gpg.stdin.write(password)
    gpg.stdin.end()

    let errorOutput = ''
    gpg.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString()
    })

    gpg.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info(`GPG encryption complete: ${outputPath}`)
        resolve()
      } else {
        logger.error(`GPG encryption failed: ${errorOutput}`)
        reject(new Error(`gpg failed with code ${code}`))
      }
    })

    gpg.on('error', reject)
  })
}

export function decryptFileGPG(
  inputPath: string,
  outputPath: string,
  password: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info(`GPG decrypting: ${inputPath} → ${outputPath}`)

    const gpg = spawn('gpg', [
      '--decrypt',
      '--batch',
      '--yes',
      '--passphrase-fd', '0',
      '--output', outputPath,
      inputPath,
    ])

    gpg.stdin.write(password)
    gpg.stdin.end()

    let errorOutput = ''
    gpg.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString()
    })

    gpg.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info(`GPG decryption complete: ${outputPath}`)
        resolve()
      } else {
        logger.error(`GPG decryption failed: ${errorOutput}`)
        reject(new Error(`gpg failed with code ${code}`))
      }
    })

    gpg.on('error', reject)
  })
}
