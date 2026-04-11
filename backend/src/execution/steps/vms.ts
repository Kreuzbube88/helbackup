import { spawn } from 'child_process'
import { createWriteStream } from 'fs'
import { executeRsync } from '../../tools/rsync.js'
import { parseNasConfig, createNasTempDir, transferAndCleanup, finalizeLocalBackup } from './nasTransfer.js'
import type { JobExecutionEngine } from '../engine.js'
import { getEncryptionPassword } from '../../utils/encryptionKey.js'
import { encryptFileGPG } from '../../utils/gpgEncrypt.js'
import path from 'path'
import fs from 'fs/promises'

export interface VMBackupConfig {
  vms: string[]
  destination: string
  targetId: string
  includeDisks: boolean
  useEncryption: boolean
}

interface VMInfo {
  name: string
  uuid: string
  diskPaths: string[]
}

// ── virsh helpers ──────────────────────────────────────────────────────────────

function runVirsh(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('virsh', args)
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`virsh ${args[0]} failed: ${stderr.trim()}`))
      else resolve(stdout)
    })
    proc.on('error', reject)
  })
}

async function getVMState(vmName: string): Promise<string> {
  const out = await runVirsh(['domstate', vmName])
  return out.trim()
}

async function shutdownVM(vmName: string, engine: JobExecutionEngine): Promise<void> {
  await runVirsh(['shutdown', vmName])
  engine.log('info', 'system', `Waiting for VM ${vmName} to shut down...`)

  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000))
    const state = await getVMState(vmName)
    if (state === 'shut off') return
    engine.log('info', 'system', `VM ${vmName} state: ${state}`)
  }
  throw new Error(`VM ${vmName} did not shut down within 120 seconds`)
}

async function startVM(vmName: string): Promise<void> {
  await runVirsh(['start', vmName])
}

// ── backup helpers ─────────────────────────────────────────────────────────────

async function getVMInfo(vmName: string): Promise<VMInfo> {
  const xml = await runVirsh(['dumpxml', vmName])

  const diskMatches = xml.matchAll(/<source file=['"]([^'"]+)['"]/g)
  const diskPaths = Array.from(diskMatches, (m) => m[1])

  const uuidMatch = xml.match(/<uuid>([^<]+)<\/uuid>/)
  const uuid = uuidMatch ? uuidMatch[1] : ''

  return { name: vmName, uuid, diskPaths }
}

async function exportVMXML(vmName: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const virsh = spawn('virsh', ['dumpxml', vmName])
    const file = createWriteStream(destPath)

    virsh.stdout.pipe(file)

    virsh.on('close', (code: number | null) => {
      if (code === 0) resolve()
      else reject(new Error(`Failed to export VM XML for ${vmName}`))
    })

    virsh.on('error', reject)
  })
}

// ── main export ────────────────────────────────────────────────────────────────

export async function executeVMBackup(
  config: VMBackupConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', 'Starting VM backup')

  const { db } = await import('../../db/database.js')
  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as { type: string; config: string } | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  let targetConfig: { path: string }
  try {
    targetConfig = JSON.parse(target.config) as { path: string }
  } catch {
    throw new Error(`Invalid target config JSON for target ${config.targetId}`)
  }

  const nasConfig = await parseNasConfig(target)
  const destPath = path.join(targetConfig.path, 'vms', new Date().toISOString().split('T')[0])
  const workDir = nasConfig ? await createNasTempDir('vms') : destPath + '.partial'
  if (!nasConfig) await fs.mkdir(workDir, { recursive: true })
  engine.registerWorkDir(workDir)

  engine.log('info', 'system', `Backing up ${config.vms.length} VMs to ${destPath}`)

  for (const vmName of config.vms) {
    let wasRunning = false

    try {
      // Check running state before backup
      const state = await getVMState(vmName)
      wasRunning = state === 'running'

      if (wasRunning) {
        engine.log('info', 'system', `Shutting down VM: ${vmName}`)
        await shutdownVM(vmName, engine)
        engine.log('info', 'system', `VM ${vmName} is now stopped`)
      }

      const vmInfo = await getVMInfo(vmName)

      engine.log('info', 'system', `VM UUID: ${vmInfo.uuid}`, undefined, {
        container: {
          id: vmInfo.uuid,
          name: vmName,
          action: 'export',
          result: 'pending',
        },
      })

      const xmlDestPath = path.join(workDir, `${vmName}.xml`)
      await exportVMXML(vmName, xmlDestPath)

      engine.log('info', 'file', `VM config exported: ${vmName}.xml`, undefined, {
        file: {
          path: xmlDestPath,
          size: (await fs.stat(xmlDestPath)).size,
          result: 'copied',
        },
      })

      if (config.includeDisks && vmInfo.diskPaths.length > 0) {
        engine.log('info', 'system', `Backing up ${vmInfo.diskPaths.length} disk(s) for ${vmName}`)

        // Translate host paths to container paths (virsh returns host paths)
        const containerDiskPaths = vmInfo.diskPaths.map(p =>
          p.startsWith('/mnt/cache/') ? p.replace('/mnt/cache/', '/unraid/cache/')
          : p.startsWith('/mnt/user/') ? p.replace('/mnt/user/', '/unraid/user/')
          : p
        )

        for (const diskPath of containerDiskPaths) {
          try {
            const diskName = path.basename(diskPath)
            const diskDestPath = path.join(workDir, vmName, diskName)

            engine.log('info', 'system', `Backing up disk: ${diskName}`)
            await fs.mkdir(path.dirname(diskDestPath), { recursive: true })

            await executeRsync({
              source: diskPath,
              destination: diskDestPath,
              onProgress: (() => { let last = -1; return (data: { percent: number; speed: string; transferred: string }) => {
                if (data.percent < last) last = -1
                if (Math.floor(data.percent / 10) > Math.floor(last / 10)) {
                  last = data.percent
                  engine.log('info', 'system', `Progress: ${data.percent}% - ${data.speed}`, undefined, {
                    progress: { current: parseInt(data.transferred.replace(/,/g, '')), total: 0, unit: 'bytes', speed: parseFloat(data.speed) * 1024 * 1024 },
                  })
                }
              } })(),
            })

            engine.log('info', 'file', `Disk backed up: ${diskName}`, undefined, {
              file: {
                path: diskDestPath,
                size: (await fs.stat(diskDestPath)).size,
                result: 'copied',
              },
            })
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err)
            const stack = err instanceof Error ? err.stack : undefined
            engine.log('error', 'file', `Failed to backup disk ${diskPath}: ${message}`, undefined, {
              error: { code: 'DISK_BACKUP_FAILED', stack, suggestion: 'Check disk path and permissions' },
            })
          }
        }
      }

      engine.log('info', 'system', `VM backup completed: ${vmName}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined
      engine.log('error', 'system', `Failed to backup VM ${vmName}: ${message}`, undefined, {
        error: { code: 'VM_BACKUP_FAILED', stack, suggestion: 'Check VM name, libvirt socket mount, and virsh availability' },
      })
    } finally {
      // Always restart VM if it was running before backup — even on error
      if (wasRunning) {
        try {
          await startVM(vmName)
          engine.log('info', 'system', `VM ${vmName} restarted`)
        } catch (startErr: unknown) {
          const msg = startErr instanceof Error ? startErr.message : String(startErr)
          engine.log('error', 'system', `Failed to restart VM ${vmName}: ${msg}`, undefined, {
            error: { code: 'VM_START_FAILED', suggestion: 'Start the VM manually via Unraid VM Manager' },
          })
        }
      }
    }
  }

  if (config.useEncryption) {
    engine.log('info', 'system', 'Encrypting VM backups...')
    try {
      const encryptionPassword = getEncryptionPassword()
      const entries = await fs.readdir(workDir)

      for (const entry of entries) {
        const entryPath = path.join(workDir, entry)
        const stat = await fs.stat(entryPath)

        if (stat.isFile()) {
          // Encrypt individual files (XML configs)
          const encryptedPath = `${entryPath}.gpg`
          await encryptFileGPG(entryPath, encryptedPath, encryptionPassword)
          await fs.unlink(entryPath)
          engine.log('info', 'system', `Encrypted: ${entry}`)
        } else if (stat.isDirectory()) {
          // Tar+encrypt VM disk directories (vdisks can be large)
          const tarFile = `${entryPath}.tar.gz`
          await new Promise<void>((resolve, reject) => {
            const tar = spawn('tar', ['-czf', tarFile, '-C', workDir, entry])
            tar.on('close', code => code === 0 ? resolve() : reject(new Error(`tar failed with code ${code}`)))
            tar.on('error', reject)
          })
          const encryptedFile = `${tarFile}.gpg`
          await encryptFileGPG(tarFile, encryptedFile, encryptionPassword)
          await fs.unlink(tarFile)
          await fs.rm(entryPath, { recursive: true })
          engine.log('info', 'system', `Encrypted disk directory: ${entry}`)
        }
      }

      engine.log('info', 'system', 'VM backups encrypted')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      engine.log('error', 'system', `VM encryption failed: ${msg}`)
      throw err
    }
  }

  const nasChecksums = nasConfig ? await transferAndCleanup(workDir, destPath, nasConfig, engine) : undefined
  if (!nasConfig) await finalizeLocalBackup(workDir, destPath, engine)
  engine.recordBackupPath('vms', destPath, config.targetId, nasChecksums)
  engine.log('info', 'system', 'VM backup completed')
}
