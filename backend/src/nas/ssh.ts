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

export async function executeSSHCommand(config: SSHConfig, command: string, timeoutMs = 60_000): Promise<SSHResult> {
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

        // Timeout for command execution in addition to the connection timeout
        const execTimeout = setTimeout(() => {
          stream.destroy()
          conn.end()
          reject(new Error(`SSH command timed out after ${timeoutMs / 1000}s: ${command}`))
        }, timeoutMs)

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

/**
 * Non-interactive, backgrounded shutdown. `sudo -n` never prompts, so a
 * user without NOPASSWD fails through instantly to the next fallback. The
 * `nohup … &` detaches the actual shutdown from the SSH session, so the
 * session returns in <1s and we don't race the kernel tearing down TCP.
 * The expected mid-command SSH teardown is caught and treated as success;
 * the caller verifies the host actually went offline via ping.
 */
export async function shutdownNAS(config: SSHConfig, nasType?: string): Promise<SSHResult> {
  const chain = buildShutdownChain(nasType)
  const command = `nohup sh -c '( sleep 1; ${chain} ) >/dev/null 2>&1 &' ; exit 0`
  try {
    return await executeSSHCommand(config, command, 15_000)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/ECONNRESET|closed|ended|ETIMEDOUT|EPIPE/i.test(msg)) {
      return { success: true, output: 'ssh session closed (expected during shutdown)' }
    }
    throw err
  }
}

function buildShutdownChain(nasType?: string): string {
  const generic = [
    'sudo -n /sbin/poweroff',
    'sudo -n poweroff',
    'sudo -n shutdown -h now',
    '/sbin/poweroff',
    'poweroff',
    'shutdown -h now',
  ]
  const perType: Record<string, string[]> = {
    synology: ['sudo -n /sbin/poweroff', 'sudo -n shutdown -h now'],
    qnap:     ['sudo -n /sbin/poweroff', 'sudo -n /sbin/halt'],
    truenas:  ['sudo -n /sbin/shutdown -p now', 'sudo -n poweroff'],
    omv:      ['sudo -n /sbin/poweroff', 'sudo -n shutdown -h now'],
    unraid:   ['sudo -n /sbin/powerdown', 'sudo -n /sbin/poweroff'],
  }
  const list = nasType && perType[nasType] ? [...perType[nasType], ...generic] : generic
  const seen = new Set<string>()
  return list.filter(c => (seen.has(c) ? false : (seen.add(c), true))).join(' || ')
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
      // Use ~ (expands from /etc/passwd) not $HOME — on Synology these can differ,
      // and sshd resolves AuthorizedKeysFile using the passwd entry, not $HOME
      const cmd = [
        'mkdir -p ~/.ssh',
        'chmod 700 ~/.ssh',
        `grep -qxF '${key}' ~/.ssh/authorized_keys 2>/dev/null || printf '%s\\n' '${key}' >> ~/.ssh/authorized_keys`,
        'chmod 600 ~/.ssh/authorized_keys',
        // Fix home dir permissions for SSH StrictModes (Synology default: 777, owned by root)
        // sudo -n is non-interactive: succeeds immediately if NOPASSWD (Synology admin), fails instantly otherwise — never hangs
        'sudo -n chmod go-w ~ 2>/dev/null || chmod go-w ~ 2>/dev/null || true',
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
