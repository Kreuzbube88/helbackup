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

export interface ExecOptions {
  timeoutMs?: number             // default 60_000
  pty?: boolean                  // default false — request a TTY (needed for sudo on some OSes)
  tolerateDisconnect?: boolean   // default false — treat mid-command disconnect/no-exit-code as success
}

export async function executeSSHCommand(
  config: SSHConfig,
  command: string,
  opts: ExecOptions = {},
): Promise<SSHResult> {
  const timeoutMs = opts.timeoutMs ?? 60_000
  const pty = opts.pty ?? false
  const tolerate = opts.tolerateDisconnect ?? false

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
    let settled = false
    const settle = (fn: () => void): void => { if (!settled) { settled = true; fn() } }

    conn.on('ready', () => {
      logger.info(`SSH connected to ${config.host}`)
      const execCb = (err: Error | undefined, stream: import('ssh2').ClientChannel): void => {
        if (err) {
          logger.error(`SSH exec error: ${err.message}`)
          conn.end()
          settle(() => reject(err))
          return
        }

        let output = ''
        let errorOutput = ''

        const execTimeout = setTimeout(() => {
          stream.destroy()
          conn.end()
          if (tolerate) {
            logger.info(`SSH command timed out after ${timeoutMs / 1000}s (expected for shutdown): ${command}`)
            settle(() => resolve({ success: true, output, error: undefined }))
          } else {
            settle(() => reject(new Error(`SSH command timed out after ${timeoutMs / 1000}s: ${command}`)))
          }
        }, timeoutMs)

        stream.on('close', (code: number | null, signal: string | null) => {
          clearTimeout(execTimeout)
          conn.end()
          if (code === 0) {
            settle(() => resolve({ success: true, output }))
          } else if (tolerate && (code == null || signal != null)) {
            logger.info(`SSH stream closed without exit code (expected for shutdown): ${command}`)
            settle(() => resolve({ success: true, output, error: undefined }))
          } else {
            logger.warn(`SSH command exited with code ${code ?? 'null'}: ${command}`)
            settle(() => resolve({ success: false, error: errorOutput || `Exit code: ${code ?? 'null'}` }))
          }
        })

        stream.on('data', (data: Buffer) => { output += data.toString() })
        stream.stderr.on('data', (data: Buffer) => { errorOutput += data.toString() })
      }

      if (pty) {
        conn.exec(command, { pty: true }, execCb)
      } else {
        conn.exec(command, execCb)
      }
    })

    conn.on('error', (err) => {
      if (tolerate && settled === false) {
        logger.info(`SSH disconnected during command (expected for shutdown): ${err.message}`)
        settle(() => resolve({ success: true, output: '', error: undefined }))
        return
      }
      logger.error(`SSH connection error: ${err.message}`)
      settle(() => reject(err))
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
 * Universal shutdown cascade covering Synology / QNAP / TrueNAS / OMV / Unraid /
 * plain Linux. `sudo -n` is non-interactive so it fails fast without NOPASSWD
 * instead of hanging; absolute /sbin paths cover the stripped non-interactive
 * SSH PATH; bare forms cover distros where the binaries live elsewhere;
 * `shutdown -p now` is for TrueNAS/FreeBSD. Runs with PTY so sudoers rules
 * like `Defaults requiretty` still allow the command. The SSH session will
 * normally be torn down mid-command — executeSSHCommand tolerates that.
 */
const SHUTDOWN_CASCADE = [
  'sudo -n /sbin/poweroff',
  'sudo -n /sbin/shutdown -h now',
  'sudo -n /sbin/shutdown -p now',
  'sudo -n poweroff',
  'sudo -n shutdown -h now',
  '/sbin/poweroff',
  '/sbin/shutdown -h now',
].join(' || ')

export async function shutdownNAS(config: SSHConfig): Promise<SSHResult> {
  return executeSSHCommand(config, SHUTDOWN_CASCADE, {
    timeoutMs: 15_000,
    pty: true,
    tolerateDisconnect: true,
  })
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
