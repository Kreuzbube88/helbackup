import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { logger } from './logger.js'

export interface RcloneCryptConfig {
  remoteName: string  // e.g. "b2:bucket/helbackup"
  password: string
  salt?: string
}

export async function createRcloneCryptRemote(
  config: RcloneCryptConfig,
  rcloneConfigPath?: string
): Promise<string> {
  const cryptRemoteName = `helbackup-crypt-${Date.now()}`

  const obscuredPassword = await obscurePassword(config.password)
  const obscuredSalt = config.salt ? await obscurePassword(config.salt) : ''

  const resolvedPath = rcloneConfigPath ?? '/app/data/rclone/rclone.conf'
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true })

  const cryptConfig = [
    `\n[${cryptRemoteName}]`,
    `type = crypt`,
    `remote = ${config.remoteName}`,
    `password = ${obscuredPassword}`,
    obscuredSalt ? `password2 = ${obscuredSalt}` : '',
    `filename_encryption = standard`,
    `directory_name_encryption = true`,
    '',
  ].filter(Boolean).join('\n')

  await fs.appendFile(resolvedPath, cryptConfig)

  logger.info(`Created Rclone crypt remote: ${cryptRemoteName}`)

  return cryptRemoteName
}

function obscurePassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('rclone', ['obscure', password])

    let output = ''
    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString()
    })

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(output.trim())
      } else {
        reject(new Error(`rclone obscure failed with code ${code}`))
      }
    })

    proc.on('error', reject)
  })
}

export function testRcloneCryptRemote(remoteName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('rclone', ['ls', `${remoteName}:`])

    proc.on('close', (code: number | null) => {
      resolve(code === 0)
    })
  })
}

export async function deleteRcloneCryptRemote(
  remoteName: string,
  rcloneConfigPath?: string
): Promise<void> {
  const configPath = rcloneConfigPath ?? '/app/data/rclone/rclone.conf'
  try {
    const content = await fs.readFile(configPath, 'utf8')
    // Remove the [remoteName] section and all lines until the next section
    const sectionRegex = new RegExp(`\\[${remoteName}\\][\\s\\S]*?(?=\\[|$)`, 'g')
    const cleaned = content.replace(sectionRegex, '').replace(/\n{3,}/g, '\n\n')
    await fs.writeFile(configPath, cleaned, 'utf8')
    logger.info(`Deleted Rclone crypt remote: ${remoteName}`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.warn(`Could not delete rclone crypt remote ${remoteName}: ${msg}`)
  }
}
