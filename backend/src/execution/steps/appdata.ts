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
import { parseNasConfig, createNasTempDir, transferAndCleanup, finalizeLocalBackup } from './nasTransfer.js'
import { getSettingInt, getSettingString } from '../../utils/settings.js'
import type { JobExecutionEngine } from '../engine.js'
import type { TargetRow } from '../../types/rows.js'

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
  targetId: string
  allContainersDynamic?: boolean  // when true: resolve containers from Docker at runtime
  containers: string[]            // used when allContainersDynamic is falsy
  excludedContainers?: string[]   // container names to skip in dynamic mode
  stopOrderPriority?: string[]    // in dynamic mode: stop these first (in order), rest alphabetically
  stopContainers: boolean
  stopOrder: string[]             // used when allContainersDynamic is falsy
  method: 'tar' | 'rsync'
  stopDelay?: number
  restartDelay?: number
  useDatabaseDumps?: boolean
  databaseContainers?: string[]
  externalVolumes?: ExternalVolumeConfig[]
  containerSettings?: Record<string, ContainerBackupSettings>
  useEncryption: boolean
  bwlimitKb?: number
  dryRun?: boolean
}

// Resolve the actual appdata directory paths for a container via Docker inspect.
// Filters bind mounts containing /appdata/ and translates host paths to container-accessible paths.
// Falls back to <source>/<containerName> if no appdata binds are found.
async function resolveAppdataPaths(
  containerName: string,
  fallbackSource: string,
  engine: JobExecutionEngine
): Promise<string[]> {
  try {
    const details = await inspectContainer(containerName)
    const binds: string[] = details.HostConfig.Binds ?? []
    const paths: string[] = []

    for (const bind of binds) {
      const hostPath = bind.split(':')[0]
      if (!hostPath.includes('/appdata/')) continue

      let containerPath: string | null = null
      if (hostPath.startsWith('/mnt/cache/')) {
        containerPath = hostPath.replace('/mnt/cache/', '/unraid/cache/')
      } else if (hostPath.startsWith('/mnt/user/')) {
        containerPath = hostPath.replace('/mnt/user/', '/unraid/user/')
      } else {
        engine.log('warn', 'system', `Appdata path "${hostPath}" for "${containerName}" is on an unmapped mount — skipping (add a custom volume mount to expose it)`)
      }

      if (containerPath) paths.push(containerPath)
    }

    // Remove paths that are subdirectories of another path already in the list
    const deduped = paths.filter((p, _, arr) =>
      !arr.some(other => other !== p && p.startsWith(other + '/'))
    )

    if (deduped.length > 0) return deduped
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    engine.log('warn', 'system', `Could not inspect container "${containerName}" for appdata paths: ${msg} — falling back to convention`)
  }

  // Convention fallback: <source>/<containerName>
  return [path.join(fallbackSource, containerName)]
}

export async function executeAppdataBackup(
  config: AppdataBackupConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', 'Starting Appdata backup')

  const source = getSettingString('appdata_source_path', '/unraid/cache/appdata')

  // CRITICAL: Never stop/include HELBACKUP itself
  const allContainers = await listContainers()
  // containers/stopOrder store names (e.g. "jellyfin"), not Docker IDs — use names throughout
  const runningBeforeBackup = new Set(
    allContainers
      .filter(c => c.State === 'running')
      .map(c => c.Names[0]?.replace('/', '') ?? c.Id)
  )
  const helbackupName = allContainers.find(c =>
    c.Names.some(n => n.toLowerCase().includes('helbackup'))
  )?.Names[0]?.replace('/', '')

  // Use local copies to avoid mutating the caller's config object on retry
  let containers: string[]
  let stopOrder: string[]

  if (config.allContainersDynamic === true) {
    const excluded = new Set(config.excludedContainers ?? [])
    containers = allContainers
      .map(c => c.Names[0]?.replace('/', '') ?? c.Id)
      .filter(name => name !== helbackupName && !excluded.has(name))
    // Priority containers first (in order), then remaining alphabetically
    const prioritized = (config.stopOrderPriority ?? []).filter(n => containers.includes(n))
    const rest = containers.filter(n => !prioritized.includes(n)).sort()
    stopOrder = [...prioritized, ...rest]
    engine.log('info', 'system', `Dynamic mode: resolved ${containers.length} container(s) — priority: [${prioritized.join(', ')}], rest: [${rest.join(', ')}]`)
  } else {
    containers = helbackupName
      ? (config.containers ?? []).filter(name => name !== helbackupName)
      : [...(config.containers ?? [])]
    // Fallback: old jobs may not have stopOrder — use containers as default order
    const rawStopOrder = (config.stopOrder ?? []).length > 0 ? (config.stopOrder ?? []) : (config.containers ?? [])
    stopOrder = helbackupName
      ? rawStopOrder.filter(name => name !== helbackupName)
      : [...rawStopOrder]
  }

  if (helbackupName) {
    engine.log('info', 'system', 'HELBACKUP container excluded from backup scope')
  }

  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as TargetRow | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  let targetConfig: TargetConfig
  try {
    targetConfig = JSON.parse(target.config) as TargetConfig
  } catch {
    throw new Error(`Invalid target config JSON for target ${config.targetId}`)
  }

  const nasConfig = await parseNasConfig(target)
  const destPath = path.join(targetConfig.path, 'appdata', new Date().toISOString().split('T')[0])
  const workDir = nasConfig ? await createNasTempDir('appdata') : destPath + '.partial'
  if (!nasConfig) await fs.mkdir(workDir, { recursive: true })
  engine.registerWorkDir(workDir)

  // Pre-flight: verify source path is accessible BEFORE stopping any containers
  // Shfs/FUSE on Unraid (cache-only shares) can fail stat or readdir individually
  // while still being accessible for rsync. Mirror fs.ts: only abort if BOTH fail.
  {
    let statOk = false
    let readdirOk = false
    let lastErr: unknown
    try { await fs.stat(source); statOk = true } catch { /* try readdir */ }
    if (!statOk) {
      try { await fs.readdir(source); readdirOk = true } catch (e) { lastErr = e }
    }
    if (!statOk && !readdirOk) {
      const errMsg = lastErr instanceof Error ? lastErr.message : String(lastErr)
      throw new Error(`Appdata source path not accessible: ${source} (${errMsg}) — check that /mnt/user is mounted as /unraid/user in docker-compose`)
    }
  }

  // Database dumps BEFORE stopping containers
  // In dynamic mode, databaseContainers is always [] — fall back to the resolved containers list
  const dbContainers = config.allContainersDynamic
    ? (config.useDatabaseDumps ? containers : [])
    : (config.databaseContainers ?? [])
  if (config.useDatabaseDumps && dbContainers.length > 0) {
    await dumpDatabaseContainers(dbContainers, workDir, engine)
  }

  // Export container configs BEFORE stopping
  engine.log('info', 'system', 'Exporting container configs...')
  const containerConfigs: unknown[] = []
  for (const containerId of containers) {
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

  await fs.writeFile(path.join(workDir, 'containers.json'), JSON.stringify(containerConfigs, null, 2))

  // Determine which containers to stop (respect per-container skipStopping)
  const stopOrderFiltered = stopOrder.filter(id =>
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
        if (runningBeforeBackup.has(id)) {
          stopped.push(id)
        }
        engine.log('info', 'container', `Stopped: ${name}`, undefined, {
          container: { id, name, action: 'stop', result: 'success' }
        })
        const stopDelay = (config.stopDelay ?? 10) * 1000
        if (stopDelay > 0) await new Promise(r => setTimeout(r, stopDelay))
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
      if (containers.length > 0) {
        let totalFiles = 0
        let totalBytes = 0
        for (const containerName of containers) {
          const appdataPaths = await resolveAppdataPaths(containerName, source, engine)
          for (const appdataPath of appdataPaths) {
            try { await fs.stat(appdataPath) } catch {
              engine.log('warn', 'system', `Appdata path not accessible: ${appdataPath}, skipping`)
              continue
            }
            const dirName = path.basename(appdataPath)
            engine.log('info', 'system', `Creating tar archive for: ${containerName} (${dirName})`)
            const tarResult = await createTarArchive({
              source: appdataPath,
              destination: path.join(workDir, `${containerName}_${dirName}.tar.gz`),
              compress: true,
              onProgress: ({ currentFile }) => engine.log('info', 'file', `Archiving: ${currentFile}`),
            })
            totalFiles += tarResult.filesProcessed
            totalBytes += tarResult.archiveSize
            engine.log('info', 'system', `${containerName} (${dirName}): ${tarResult.filesProcessed} files, ${tarResult.archiveSize} bytes`)
          }
        }
        engine.addTransferred(totalFiles, totalBytes)
        engine.log('info', 'system', `Tar done: ${totalFiles} files total, ${totalBytes} bytes total`)
      } else {
        // Legacy: no containers configured — backup entire appdata
        engine.log('info', 'system', 'Creating tar archive (full appdata)...')
        const tarResult = await createTarArchive({
          source: source,
          destination: path.join(workDir, 'appdata.tar.gz'),
          compress: true,
          onProgress: ({ currentFile }) => engine.log('info', 'file', `Archiving: ${currentFile}`),
        })
        engine.addTransferred(tarResult.filesProcessed, tarResult.archiveSize)
        engine.log('info', 'system', `Tar archive created: ${tarResult.filesProcessed} files, ${tarResult.archiveSize} bytes`)
      }
    } else {
      // Verify source exists before rsync
      try {
        const entries = await fs.readdir(source)
        engine.log('info', 'system', `Starting rsync: ${source} → ${destPath} (${entries.length} top-level entries)`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(`Appdata source path not accessible: ${source} — ${msg}`)
      }

      // Per-step limit takes precedence over global setting
      const bwLimit = config.bwlimitKb ?? getSettingInt('rsync_bwlimit_kb', 0)
      if (config.dryRun) engine.log('info', 'system', 'dry-run mode: rsync will simulate transfer without writing files')

      if (containers.length > 0) {
        let totalFiles = 0
        let totalBytes = 0
        const mountErrors: string[] = []
        for (const containerName of containers) {
          const appdataPaths = await resolveAppdataPaths(containerName, source, engine)
          const perContainerExclusions = config.containerSettings?.[containerName]?.exclusions ?? []
          for (const appdataPath of appdataPaths) {
            try {
              await fs.stat(appdataPath)
            } catch {
              engine.log('warn', 'system', `Appdata path not accessible: ${appdataPath}, skipping`)
              continue
            }
            const destDir = path.join(workDir, containerName, path.basename(appdataPath))
            await fs.mkdir(destDir, { recursive: true })
            engine.log('info', 'system', `Rsyncing appdata: ${containerName} (${appdataPath})`)
            try {
              const result = await executeRsync({
                source: appdataPath + '/',
                destination: destDir,
                excludePatterns: ['logs/', 'cache/', '*.log', '*.sock', '*.socket', ...perContainerExclusions],
                ...(bwLimit > 0 ? { bwLimit } : {}),
                ...(config.dryRun ? { dryRun: true } : {}),
                onRegisterProcess: p => engine.registerChildProcess(p),
                onProgress: (() => { let last = -1; return ({ percent, speed }: { percent: number; speed: string }) => {
                  if (percent < last) last = -1
                  if (Math.floor(percent / 10) > Math.floor(last / 10)) { last = percent; engine.log('info', 'system', `${containerName} (${path.basename(appdataPath)}): ${percent}% — ${speed}`) }
                } })(),
              })
              totalFiles += result.filesTransferred
              totalBytes += result.bytesTransferred
              engine.log('info', 'system', `${containerName} (${path.basename(appdataPath)}): ${result.filesTransferred} files, ${result.bytesTransferred} bytes`)
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err)
              engine.log('error', 'system', `Rsync failed for ${containerName} (${appdataPath}): ${msg}`)
              mountErrors.push(`${containerName}:${path.basename(appdataPath)}`)
            }
          }
        }
        engine.addTransferred(totalFiles, totalBytes)
        engine.log('info', 'system', `Rsync done: ${totalFiles} files total, ${totalBytes} bytes total`)
        if (mountErrors.length > 0) {
          throw new Error(`Rsync failed for ${mountErrors.length} mount(s): ${mountErrors.join(', ')}`)
        }
      } else {
        // Legacy: no containers configured — backup entire appdata
        const containerExclusions: string[] = []
        if (config.containerSettings) {
          for (const settings of Object.values(config.containerSettings)) {
            if (settings.exclusions) containerExclusions.push(...settings.exclusions)
          }
        }
        const result = await executeRsync({
          source: source,
          destination: workDir,
          excludePatterns: ['*/logs/*', '*/cache/*', '*/*.log', '*.sock', '*.socket', ...containerExclusions],
          ...(bwLimit > 0 ? { bwLimit } : {}),
          ...(config.dryRun ? { dryRun: true } : {}),
          onRegisterProcess: p => engine.registerChildProcess(p),
          onProgress: (() => { let last = -1; return ({ percent, speed }: { percent: number; speed: string }) => {
            if (percent < last) last = -1
            if (Math.floor(percent / 10) > Math.floor(last / 10)) { last = percent; engine.log('info', 'system', `Progress: ${percent}% — ${speed}`) }
          } })(),
        })
        engine.addTransferred(result.filesTransferred, result.bytesTransferred)
        engine.log('info', 'system', `Rsync done: ${result.filesTransferred} files, ${result.bytesTransferred} bytes`)
      }
    }

    // Backup external volumes
    if (config.externalVolumes && config.externalVolumes.length > 0) {
      engine.log('info', 'system', `Backing up external volumes for ${config.externalVolumes.length} containers...`)

      for (const volConfig of config.externalVolumes) {
        for (const volumePath of volConfig.volumes) {
          try {
            const volumeName = path.basename(volumePath)
            const volumeDestPath = path.join(workDir, 'external-volumes', volConfig.containerName, volumeName)
            await fs.mkdir(path.dirname(volumeDestPath), { recursive: true })

            engine.log('info', 'system', `Backing up external volume: ${volumePath}`)
            await executeRsync({
              source: volumePath,
              destination: volumeDestPath,
              onRegisterProcess: p => engine.registerChildProcess(p),
              onProgress: (() => { let last = -1; return ({ percent }: { percent: number }) => {
                if (percent < last) last = -1
                if (Math.floor(percent / 10) > Math.floor(last / 10)) { last = percent; engine.log('info', 'system', `External volume progress: ${percent}%`) }
              } })(),
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
          const restartDelay = (config.restartDelay ?? 5) * 1000
          if (restartDelay > 0) await new Promise(r => setTimeout(r, restartDelay))
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
        // Pack containers.json into a separate metadata archive so it survives encryption cleanup
        const metaJson = path.join(workDir, 'containers.json')
        const metaTar = path.join(workDir, '_metadata.tar.gz')
        const metaExists = await fs.access(metaJson).then(() => true).catch(() => false)
        if (metaExists) {
          await new Promise<void>((resolve, reject) => {
            const tar = spawn('tar', ['-czf', metaTar, '-C', workDir, 'containers.json'])
            tar.on('close', code => code === 0 ? resolve() : reject(new Error(`metadata tar failed: ${code}`)))
            tar.on('error', reject)
          })
          await fs.unlink(metaJson)
        }
        // Encrypt each .tar.gz in workDir (one per container + _metadata)
        const entries = await fs.readdir(workDir)
        for (const entry of entries.filter(e => e.endsWith('.tar.gz'))) {
          const tarFile = path.join(workDir, entry)
          await encryptFileGPG(tarFile, `${tarFile}.gpg`, encryptionPassword)
          await fs.unlink(tarFile)
        }
      } else {
        // rsync method: tar the destination directory, then encrypt
        const tarFile = path.join(workDir, 'appdata-rsync.tar.gz')
        await new Promise<void>((resolve, reject) => {
          const tar = spawn('tar', ['-czf', tarFile, '--exclude=appdata-rsync.tar.gz', '--exclude=*.gpg', '-C', workDir, '.'])
          tar.on('close', (code) => code === 0 ? resolve() : reject(new Error(`tar failed with code ${code}`)))
          tar.on('error', reject)
        })
        const encryptedFile = `${tarFile}.gpg`
        await encryptFileGPG(tarFile, encryptedFile, encryptionPassword)
        await fs.unlink(tarFile)
      }

      // Remove unencrypted source files — keep only .gpg
      const cleanEntries = await fs.readdir(workDir)
      for (const entry of cleanEntries) {
        if (!entry.endsWith('.gpg')) {
          await fs.rm(path.join(workDir, entry), { recursive: true, force: true })
        }
      }

      engine.log('info', 'system', 'Appdata backup encrypted')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      engine.log('error', 'system', `Appdata encryption failed: ${msg}`)
      throw err
    }
  }

  if (!config.dryRun) {
    const nasChecksums = nasConfig ? await transferAndCleanup(workDir, destPath, nasConfig, engine) : undefined
    if (!nasConfig) await finalizeLocalBackup(workDir, destPath, engine)
    engine.recordBackupPath('appdata', destPath, config.targetId, nasChecksums)
  } else {
    engine.log('info', 'system', 'dry-run: skipping NAS transfer, finalize and manifest record')
  }
  engine.log('info', 'system', 'Appdata backup completed')
}
