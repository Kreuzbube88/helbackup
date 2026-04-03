import path from 'path'
import fs from 'fs/promises'
import { db } from '../../db/database.js'
import { listContainers, inspectContainer, stopContainer, startContainer } from '../../docker/client.js'
import { executeRsync } from '../../tools/rsync.js'
import { createTarArchive } from '../../tools/tar.js'
import type { JobExecutionEngine } from '../engine.js'

interface TargetRow {
  id: string
  config: string
}

interface TargetConfig {
  path: string
}

export interface AppdataBackupConfig {
  source: string       // /unraid/user/appdata
  targetId: string
  containers: string[] // Container IDs to include
  stopContainers: boolean
  stopOrder: string[]  // IDs in stop order
  method: 'tar' | 'rsync'
}

export async function executeAppdataBackup(
  config: AppdataBackupConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'Starting Appdata backup')

  // CRITICAL: Never stop/include HELBACKUP itself
  const allContainers = await listContainers()
  const helbackupId = allContainers.find(c =>
    c.Names.some(n => n.toLowerCase().includes('helbackup'))
  )?.Id

  if (helbackupId) {
    config.containers = config.containers.filter(id => id !== helbackupId)
    config.stopOrder = config.stopOrder.filter(id => id !== helbackupId)
    engine.log('warn', 'HELBACKUP container excluded from backup scope')
  }

  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as TargetRow | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  const targetConfig = JSON.parse(target.config) as TargetConfig
  const destPath = path.join(targetConfig.path, 'appdata', new Date().toISOString().split('T')[0])
  await fs.mkdir(destPath, { recursive: true })

  // Export container configs BEFORE stopping
  engine.log('info', 'Exporting container configs...')
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
    } catch (err: unknown) {
      engine.log('warn', `Could not inspect container ${containerId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  await fs.writeFile(path.join(destPath, 'containers.json'), JSON.stringify(containerConfigs, null, 2))

  // Stop containers in specified order
  const stopped: string[] = []
  if (config.stopContainers && config.stopOrder.length > 0) {
    engine.log('info', `Stopping ${config.stopOrder.length} containers...`)
    for (const id of config.stopOrder) {
      try {
        engine.log('info', `Stopping container: ${id}`)
        await stopContainer(id)
        stopped.push(id)
        await new Promise(r => setTimeout(r, 10_000))
      } catch (err: unknown) {
        engine.log('error', `Failed to stop ${id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  try {
    if (config.method === 'tar') {
      engine.log('info', 'Creating tar archive...')
      await createTarArchive({
        source: config.source,
        destination: path.join(destPath, 'appdata.tar.gz'),
        compress: true,
        onProgress: ({ currentFile }) => engine.log('info', `Archiving: ${currentFile}`),
      })
      engine.log('info', 'Tar archive created')
    } else {
      engine.log('info', 'Starting rsync...')
      const result = await executeRsync({
        source: config.source,
        destination: destPath,
        bwLimit: 51200,
        excludePatterns: ['*/logs/*', '*/cache/*', '*/*.log'],
        onProgress: ({ percent, speed }) => engine.log('info', `Progress: ${percent}% — ${speed}`),
      })
      engine.log('info', `Rsync done: ${result.bytesTransferred} bytes`)
    }
  } finally {
    // ALWAYS restart in reverse order
    if (stopped.length > 0) {
      engine.log('info', `Restarting ${stopped.length} containers (reverse order)...`)
      for (const id of [...stopped].reverse()) {
        try {
          engine.log('info', `Starting container: ${id}`)
          await startContainer(id)
          await new Promise(r => setTimeout(r, 5_000))
        } catch (err: unknown) {
          engine.log('error', `Failed to start ${id}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }
  }

  engine.log('info', 'Appdata backup completed')
}
