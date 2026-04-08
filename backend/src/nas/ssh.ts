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

        // Timeout for command execution (60s) in addition to the connection timeout
        const execTimeout = setTimeout(() => {
          stream.destroy()
          conn.end()
          reject(new Error(`SSH command timed out after 60s: ${command}`))
        }, 60_000)

        stream.on('close', (code: number) => {
          clearTimeout(execTimeout)
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

/** Deploy a public key to the NAS authorized_keys via password SSH, then key auth can be used. */
export async function deployPublicKey(config: SSHConfig, publicKey: string): Promise<void> {
  let privateKey: Buffer | undefined
  if (config.privateKey) {
    privateKey = await fs.readFile(config.privateKey)
  }

  return new Promise((resolve, reject) => {
    const conn = new Client()

    conn.on('ready', () => {
      // Create home dir if missing (Synology: /var/services/homes/<user> not created until User Home service enabled)
      // then append public key to authorized_keys idempotently
      const key = publicKey.trim()
      // Use printf instead of echo to avoid interpretation of escape sequences
      // Resolve $HOME via passwd to avoid mismatches between SSH-session $HOME and sshd's AuthorizedKeysFile lookup
      const cmd = [
        // Fix home dir if missing (Synology: not created until User Home service is enabled); run in subshell so && chain continues regardless
        '( [ -d "$HOME" ] || { sudo mkdir -p "$HOME" && sudo chown "$(id -u):$(id -g)" "$HOME"; } ) 2>/dev/null; true',
        // Remove group/other write bits — SSH StrictModes rejects keys when home dir is g/o-writable (Synology default: 777)
        'chmod g-w,o-w "$HOME" 2>/dev/null; true',
        'mkdir -p "$HOME/.ssh"',
        'chmod 700 "$HOME/.ssh"',
        `grep -qxF '${key}' "$HOME/.ssh/authorized_keys" 2>/dev/null || printf '%s\\n' '${key}' >> "$HOME/.ssh/authorized_keys"`,
        'chmod 600 "$HOME/.ssh/authorized_keys"',
      ].join(' && ')
      conn.exec(cmd, (err, stream) => {
        if (err) { conn.end(); reject(err); return }
        const timeout = setTimeout(() => {
          conn.end()
          reject(new Error('deploy-key timed out after 30s'))
        }, 30_000)
        stream.on('close', (code: number) => {
          clearTimeout(timeout)
          conn.end()
          if (code === 0) resolve()
          else reject(new Error(`Failed to deploy public key, exit code ${code}`))
        })
        stream.on('data', () => { /* drain stdout */ })
        stream.stderr.on('data', (d: Buffer) => logger.warn(`deploy-key stderr: ${d.toString().trim()}`))
      })
    })

    conn.on('error', reject)

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
