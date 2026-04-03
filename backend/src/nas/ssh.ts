import { Client } from 'ssh2'
import fs from 'fs/promises'
import { logger } from '../utils/logger.js'

export interface SSHConfig {
  host: string
  port?: number
  username: string
  privateKey?: string // Path to private key file
  password?: string
}

export interface SSHResult {
  success: boolean
  output?: string
  error?: string
}

export async function executeSSHCommand(config: SSHConfig, command: string): Promise<SSHResult> {
  let privateKey: Buffer | undefined
  if (config.privateKey) {
    try {
      privateKey = await fs.readFile(config.privateKey)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`Failed to read SSH key: ${msg}`)
      throw new Error(`SSH key not found: ${config.privateKey}`)
    }
  }

  return new Promise((resolve, reject) => {
    const conn = new Client()

    conn.on('ready', () => {
      logger.info(`SSH connected to ${config.host}`)
      conn.exec(command, (err, stream) => {
        if (err) {
          logger.error(`SSH exec error: ${err.message}`)
          conn.end()
          reject(err)
          return
        }

        let output = ''
        let errorOutput = ''

        stream.on('close', (code: number) => {
          conn.end()
          if (code === 0) {
            resolve({ success: true, output })
          } else {
            logger.warn(`SSH command exited with code ${code}: ${command}`)
            resolve({ success: false, error: errorOutput || `Exit code: ${code}` })
          }
        })

        stream.on('data', (data: Buffer) => { output += data.toString() })
        stream.stderr.on('data', (data: Buffer) => { errorOutput += data.toString() })
      })
    })

    conn.on('error', (err) => {
      logger.error(`SSH connection error: ${err.message}`)
      reject(err)
    })

    conn.connect({
      host: config.host,
      port: config.port ?? 22,
      username: config.username,
      privateKey,
      password: config.password,
      readyTimeout: 30000,
    })
  })
}

export async function testSSHConnection(config: SSHConfig): Promise<boolean> {
  try {
    const result = await executeSSHCommand(config, 'echo "helbackup-test"')
    return result.success
  } catch {
    return false
  }
}

export async function shutdownNAS(config: SSHConfig): Promise<SSHResult> {
  // Works with Synology, QNAP, TrueNAS, OpenMediaVault, Unraid, etc.
  return executeSSHCommand(config, 'sudo shutdown -h now')
}
