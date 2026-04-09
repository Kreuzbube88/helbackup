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
  stdin?: string                 // optional data to write to the command's stdin then close
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
      // Validate permissions before reading — must be 0600 (owner read/write only)
      const stats = await fs.stat(config.privateKey)
      const mode = stats.mode & 0o777
      if (mode & 0o077) {
        throw new Error(
          `SSH key ${config.privateKey} has insecure permissions (${(mode).toString(8).padStart(4, '0')}). ` +
          'Run: chmod 600 ' + config.privateKey
        )
      }
      privateKey = await fs.readFile(config.privateKey)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`Failed to read SSH key: ${msg}`)
      if (msg.includes('insecure permissions')) throw new Error(msg)
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
            // When pty:true is used, stderr is merged into stdout, so fall back
            // to the tail of output when errorOutput is empty.
            const tail = output.trim().split('\n').slice(-3).join(' | ').trim()
            const detail = errorOutput.trim() || tail || `Exit code: ${code ?? 'null'}`
            logger.warn(`SSH command exited with code ${code ?? 'null'}: ${command} — ${detail}`)
            settle(() => resolve({ success: false, error: detail }))
          }
        })

        stream.on('data', (data: Buffer) => { output += data.toString() })
        stream.stderr.on('data', (data: Buffer) => { errorOutput += data.toString() })

        if (opts.stdin !== undefined) {
          stream.write(opts.stdin)
          stream.end()
        }
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
 * plain Linux. Absolute /sbin paths cover the stripped non-interactive SSH
 * PATH; `shutdown -p now` is for TrueNAS/FreeBSD; the no-sudo entries at the
 * end cover boxes where we SSH in as root (Unraid default).
 *
 * Two modes:
 *  - if `config.password` is set → `sudo -S -p ""` reads the password from
 *    stdin once per attempt via a shell variable `P`, no prompt, no PTY.
 *    This is the real fix: `sudo -n` fails instantly if NOPASSWD isn't
 *    configured, which is the common case.
 *  - no password → fall back to `sudo -n`, which will still surface a clear
 *    "a password is required" stderr instead of a silent exit code 1
 *    (now that we dropped PTY, stderr is captured separately).
 */
const POWEROFF_VARIANTS = [
  '/sbin/poweroff',
  '/sbin/shutdown -h now',
  '/sbin/shutdown -p now',  // TrueNAS/FreeBSD
  'poweroff',
  'shutdown -h now',
]

function buildPasswordCascade(): string {
  const sudoed = POWEROFF_VARIANTS.map(c => `echo "$P" | sudo -S -p "" ${c}`)
  const asRoot = ['/sbin/poweroff', '/sbin/shutdown -h now']
  // read -r consumes exactly one line from stdin into P, then each attempt
  // reuses the shell variable — P is never on the command line or argv.
  return `read -r P; ${[...sudoed, ...asRoot].join(' || ')}`
}

const SUDO_N_CASCADE = [
  'sudo -n /sbin/poweroff',
  'sudo -n /sbin/shutdown -h now',
  'sudo -n /sbin/shutdown -p now',
  'sudo -n poweroff',
  'sudo -n shutdown -h now',
  '/sbin/poweroff',
  '/sbin/shutdown -h now',
].join(' || ')

export async function shutdownNAS(config: SSHConfig): Promise<SSHResult> {
  if (config.password) {
    return executeSSHCommand(config, buildPasswordCascade(), {
      timeoutMs: 15_000,
      tolerateDisconnect: true,
      stdin: `${config.password}\n`,
    })
  }
  return executeSSHCommand(config, SUDO_N_CASCADE, {
    timeoutMs: 15_000,
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
