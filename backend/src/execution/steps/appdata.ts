import { spawn } from 'node:child_process'
import path from 'path'
import fs from 'fs/promises'
import { db } from '../../db/database.js'
import { listContainers, inspectContainer, stopContainer, startContainer } from '../../docker/client.js'
import { executeRsync } from '../../tools/rsync.js'
import { createTarArchive } from '../../tools/tar.js'
import { dumpDatabaseContainers } from './database-dump.js'
import { getEncryptionPassword } from '../../utils/encryptionKey.js'
import { encryptFileGPG } from '../../utils/gpgEncrypt.js'
import type { JobExecutionEngine } from '../engine.js'

interface TargetRow {
  id: string
  config: string
}

interface TargetConfig {
  path: string
}

export interface ContainerBackupSettings {
  id: string
  skipStopping?: boolean
  exclusions?: string[]      // Paths to exclude (relative to appdata)
  backupExternalVolumes?: boolean
  useDatabaseDump?: boolean
}

export interface ExternalVolumeConfig {
  containerName: string
  volumes: string[]          // Absolute paths to backup
}

export interface AppdataBackupConfig {
  source: string             // /unraid/user/appdata
  targetId: string
  containers: string[]       // Container IDs to include
  stopContainers: boolean
  stopOrder: string[]        // IDs in stop order
  method: 'tar' | 'rsync'
  useDatabaseDumps?: boolean
  databaseContainers?: string[]
  externalVolumes?: ExternalVolumeConfig[]
  containerSettings?: Record<string, ContainerBackupSettings>
  useEncryption: boolean
}

export async function executeAppdataBackup(
  config: AppdataBackupConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', 'Starting Appdata backup')

  // CRITICAL: Never stop/include HELBACKUP itself
  const allContainers = await listContainers()
  const helbackupId = allContainers.find(c =>
    c.Names.some(n => n.toLowerCase().includes('helbackup'))
  )?.Id

  if (helbackupId) {
    config.containers = config.containers.filter(id => id !== helbackupId)
    config.stopOrder = config.stopOrder.filter(id => id !== helbackupId)
    engine.log('warn', 'system', 'HELBACKUP container excluded from backup scope')
  }

  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as TargetRow | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  const targetConfig = JSON.parse(target.config) as TargetConfig
  const destPath = path.join(targetConfig.path, 'appdata', new Date().toISOString().split('T')[0])
  await fs.mkdir(destPath, { recursive: true })

  // Database dumps BEFORE stopping containers
  if (config.useDatabaseDumps && config.databaseContainers && config.databaseContainers.length > 0) {
    await dumpDatabaseContainers(config.databaseContainers, destPath, engine)
  }

  // Export container configs BEFORE stopping
  engine.log('info', 'system', 'Exporting container configs...')
  const containerConfigs: unknown[] = []
  for (const containerId of config.containers) {
    try {
      const details = await inspectContainer(containerId)
      containerConfigs.push({
        id: containerId,
        name: details.Name,
        image: details.Config.Image,
        env: details.Config.Env,
        volumes: details.HostConfig.Binds,
        ports: details.HostConfig.PortBindings,
        network: details.HostConfig.NetworkMode,
        labels: details.Config.Labels,
      })
      engine.log('info', 'container', `Exported config: ${details.Name}`, undefined, {
        container: { id: containerId, name: details.Name, action: 'export', result: 'success' }
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      engine.log('warn', 'container', `Could not inspect container ${containerId}: ${msg}`, undefined, {
        container: { id: containerId, name: containerId, action: 'export', result: 'failed', error: msg }
      })
    }
  }

  await fs.writeFile(path.join(destPath, 'containers.json'), JSON.stringify(containerConfigs, null, 2))

  // Determine which containers to stop (respect per-container skipStopping)
  const stopOrderFiltered = config.stopOrder.filter(id =>
    !config.containerSettings?.[id]?.skipStopping
  )

  // Stop containers in specified order
  const stopped: string[] = []
  if (config.stopContainers && stopOrderFiltered.length > 0) {
    engine.log('info', 'system', `Stopping ${stopOrderFiltered.length} containers...`)
    for (const id of stopOrderFiltered) {
      try {
        const details = await inspectContainer(id).catch(() => ({ Name: id }))
        const name = details.Name ?? id
        engine.log('info', 'container', `Stopping: ${name}`, undefined, {
          container: { id, name, action: 'stop', result: 'pending' }
        })
        await stopContainer(id)
        stopped.push(id)
        engine.log('info', 'container', `Stopped: ${name}`, undefined, {
          container: { id, name, action: 'stop', result: 'success' }
        })
        await new Promise(r => setTimeout(r, 10_000))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        engine.log('error', 'container', `Failed to stop ${id}: ${msg}`, undefined, {
          container: { id, name: id, action: 'stop', result: 'failed', error: msg },
          error: { code: 'CONTAINER_STOP_FAILED', suggestion: 'Check if container exists and Docker daemon is running' }
        })
      }
    }
  }

  try {
    if (config.method === 'tar') {
      engine.log('info', 'system', 'Creating tar archive...')
      await createTarArchive({
        source: config.source,
        destination: path.join(destPath, 'appdata.tar.gz'),
        compress: true,
        onProgress: ({ currentFile }) => engine.log('info', 'file', `Archiving: ${currentFile}`),
      })
      engine.log('info', 'system', 'Tar archive created')
    } else {
      engine.log('info', 'system', 'Starting rsync...')

      // Collect global + per-container exclusions
      const containerExclusions: string[] = []
      if (config.containerSettings) {
        for (const settings of Object.values(config.containerSettings)) {
          if (settings.exclusions) {
            containerExclusions.push(...settings.exclusions)
          }
        }
      }

      const result = await executeRsync({
        source: config.source,
        destination: destPath,
        bwLimit: 51200,
        excludePatterns: ['*/logs/*', '*/cache/*', '*/*.log', ...containerExclusions],
        onProgress: ({ percent, speed }) => engine.log('info', 'system', `Progress: ${percent}% — ${speed}`),
      })
      engine.log('info', 'system', `Rsync done: ${result.bytesTransferred} bytes`)
    }

    // Backup external volumes
    if (config.externalVolumes && config.externalVolumes.length > 0) {
      engine.log('info', 'system', `Backing up external volumes for ${config.externalVolumes.length} containers...`)

      for (const volConfig of config.externalVolumes) {
        for (const volumePath of volConfig.volumes) {
          try {
            const volumeName = path.basename(volumePath)
            const volumeDestPath = path.join(destPath, 'external-volumes', volConfig.containerName, volumeName)
            await fs.mkdir(path.dirname(volumeDestPath), { recursive: true })

            engine.log('info', 'system', `Backing up external volume: ${volumePath}`)
            await executeRsync({
              source: volumePath,
              destination: volumeDestPath,
              bwLimit: 51200,
              onProgress: ({ percent }) => engine.log('info', 'system', `External volume progress: ${percent}%`),
            })
            engine.log('info', 'system', `External volume backed up: ${volumePath}`)
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            engine.log('error', 'file', `Failed to backup external volume ${volumePath}: ${msg}`)
          }
        }
      }
    }
  } finally {
    // ALWAYS restart in reverse order
    if (stopped.length > 0) {
      engine.log('info', 'system', `Restarting ${stopped.length} containers (reverse order)...`)
      for (const id of [...stopped].reverse()) {
        try {
          engine.log('info', 'container', `Starting: ${id}`, undefined, {
            container: { id, name: id, action: 'start', result: 'pending' }
          })
          await startContainer(id)
          engine.log('info', 'container', `Started: ${id}`, undefined, {
            container: { id, name: id, action: 'start', result: 'success' }
          })
          await new Promise(r => setTimeout(r, 5_000))
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          engine.log('error', 'container', `Failed to start ${id}: ${msg}`, undefined, {
            container: { id, name: id, action: 'start', result: 'failed', error: msg }
          })
        }
      }
    }
  }

  if (config.useEncryption) {
    engine.log('info', 'system', 'Encrypting appdata backup...')
    try {
      const encryptionPassword = getEncryptionPassword()

      if (config.method === 'tar') {
        const tarFile = path.join(destPath, 'appdata.tar.gz')
        const encryptedFile = `${tarFile}.gpg`
        await encryptFileGPG(tarFile, encryptedFile, encryptionPassword)
        await fs.unlink(tarFile)
      } else {
        // rsync method: tar the destination directory, then encrypt
        const tarFile = path.join(destPath, 'appdata-rsync.tar.gz')
        await new Promise<void>((resolve, reject) => {
          const tar = spawn('tar', ['-czf', tarFile, '-C', destPath, '.', '--exclude=appdata-rsync.tar.gz'])
          tar.on('close', (code) => code === 0 ? resolve() : reject(new Error(`tar failed with code ${code}`)))
          tar.on('error', reject)
        })
        const encryptedFile = `${tarFile}.gpg`
        await encryptFileGPG(tarFile, encryptedFile, encryptionPassword)
        await fs.unlink(tarFile)
      }

      engine.log('info', 'system', 'Appdata backup encrypted')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      engine.log('error', 'system', `Appdata encryption failed: ${msg}`)
      throw err
    }
  }

  engine.log('info', 'system', 'Appdata backup completed')
}
