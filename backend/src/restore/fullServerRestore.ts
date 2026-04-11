import { type RestorePlan, type RestoreItem } from './restorePlan.js'
import { logger } from '../utils/logger.js'
import { notificationManager } from '../notifications/notificationManager.js'
import { executeRsync } from '../tools/rsync.js'
import { getSettingString } from '../utils/settings.js'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'

export async function executeFullServerRestore(
  backupId: string,
  plan: RestorePlan
): Promise<void> {
  logger.info(`Starting full server restore for backup: ${backupId}`)

  if (!plan.backupPath) {
    throw new Error('Restore plan is missing backupPath — cannot locate backup files')
  }

  await notificationManager.notify({
    event: 'restore_started',
    backupId,
    timestamp: new Date().toISOString(),
    details: { itemCount: plan.items.length },
  })

  const startTime = Date.now()
  let successCount = 0
  let failureCount = 0

  try {
    for (const group of plan.executionOrder) {
      logger.info(`Restoring group: ${group.length} item(s) at priority ${group[0]?.priority ?? '?'}`)

      for (const item of group) {
        try {
          logger.info(`Restoring: ${item.name} (${item.type}) — path: ${item.path}`)
          await restoreItem(item, plan.backupPath)
          successCount++
          logger.info(`Restored: ${item.name}`)
        } catch (err: unknown) {
          failureCount++
          const msg = err instanceof Error ? err.message : String(err)
          logger.error(`Failed to restore ${item.name}: ${msg}`)
        }
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000)
    logger.info(`Full server restore complete — success: ${successCount}, failed: ${failureCount}, duration: ${duration}s`)

    await notificationManager.notify({
      event: 'restore_completed',
      backupId,
      timestamp: new Date().toISOString(),
      duration,
      details: { success: successCount, failed: failureCount },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`Full server restore failed: ${msg}`)

    await notificationManager.notify({
      event: 'restore_failed',
      backupId,
      timestamp: new Date().toISOString(),
      error: msg,
    })

    throw err
  }
}

async function restoreItem(item: RestoreItem, backupPath: string): Promise<void> {
  const parts = item.path.split('/')
  const absItemPath = path.join(backupPath, item.path)

  switch (item.type) {
    case 'flash': {
      // Rsync the flash backup directory contents to the configured flash source path
      const flashDest = getSettingString('flash_source_path', '/unraid/boot')
      const flashDir = path.join(backupPath, parts[0])
      logger.info(`[restore] flash: ${flashDir}/ → ${flashDest}`)
      await executeRsync({
        source: flashDir + '/',
        destination: flashDest,
        excludePatterns: ['previous/', 'System Volume Information/'],
        onLog: msg => { if (msg.trim()) logger.debug(`[rsync] ${msg.trim()}`) },
      })
      logger.info('[restore] flash: done — reboot required to apply changes')
      break
    }

    case 'appdata': {
      // item.name = "Container: {containerName}"
      const containerName = item.name.replace('Container: ', '')
      const appdataBase = path.join(backupPath, 'appdata')
      const appdataRestoreBase = getSettingString('appdata_source_path', '/unraid/cache/appdata')
      const targetDir = path.join(appdataRestoreBase, containerName)
      await fs.mkdir(targetDir, { recursive: true })

      // Detect backup mode: rsync leaves a containerName/ dir, tar leaves containerName_*.tar.gz files
      const sourceDir = await resolveContainerDirOptional(appdataBase, containerName)
      if (sourceDir) {
        // Rsync mode
        logger.info(`[restore] appdata (rsync): ${sourceDir}/ → ${targetDir}`)
        await executeRsync({
          source: sourceDir + '/',
          destination: targetDir,
          bwLimit: 51200,
          onLog: msg => { if (msg.trim()) logger.debug(`[rsync] ${msg.trim()}`) },
        })
      } else {
        // Tar mode: find all <containerName>_*.tar.gz files (may be in a date subdir)
        const tarFiles = await findContainerTarFiles(appdataBase, containerName)
        if (tarFiles.length === 0) {
          throw new Error(`No backup data found for container "${containerName}" under ${appdataBase}`)
        }
        for (const tarFile of tarFiles) {
          logger.info(`[restore] appdata (tar): extracting ${path.basename(tarFile)} → ${targetDir}`)
          await extractTarArchive(tarFile, targetDir)
        }
      }

      await ensurePostgresDataDirs(targetDir)
      break
    }

    case 'vm': {
      // Copy XML to temp, define with virsh
      const xmlDest = path.join('/tmp/restore-vms', path.basename(absItemPath))
      await fs.mkdir('/tmp/restore-vms', { recursive: true })
      await fs.copyFile(absItemPath, xmlDest)
      await runCommand('virsh', ['define', xmlDest])
      logger.info(`[restore] vm: defined from ${xmlDest}`)
      break
    }

    case 'docker-image': {
      logger.info(`[restore] docker-image: loading ${absItemPath}`)
      await runCommand('docker', ['load', '-i', absItemPath])
      break
    }

    case 'system-config': {
      // Rsync config backup to /tmp/restore-config — admin applies manually
      const configDir = path.join(backupPath, parts[0])
      const tempDest = '/tmp/restore-config'
      await fs.mkdir(tempDest, { recursive: true })
      logger.info(`[restore] system-config: ${configDir}/ → ${tempDest}`)
      await executeRsync({
        source: configDir + '/',
        destination: tempDest,
        onLog: msg => { if (msg.trim()) logger.debug(`[rsync] ${msg.trim()}`) },
      })
      logger.info('[restore] system-config: files staged at /tmp/restore-config — apply manually as needed')
      break
    }

    case 'database': {
      // Copy dump to /tmp/db-restore for manual import
      const dumpDest = path.join('/tmp/db-restore', path.basename(path.dirname(absItemPath)))
      await fs.mkdir(dumpDest, { recursive: true })
      const stat = await fs.stat(absItemPath)
      if (stat.isDirectory()) {
        await executeRsync({
          source: absItemPath + '/',
          destination: dumpDest,
          onLog: msg => { if (msg.trim()) logger.debug(`[rsync] ${msg.trim()}`) },
        })
      } else {
        await fs.copyFile(absItemPath, path.join(dumpDest, path.basename(absItemPath)))
      }
      logger.info(`[restore] database: dump staged at ${dumpDest}`)
      break
    }

    default: {
      logger.warn(`[restore] unknown type: ${item.type}, path: ${item.path}`)
    }
  }
}

/** Find container rsync dir — returns null if not found (use for mode detection). */
async function resolveContainerDirOptional(appdataBase: string, containerName: string): Promise<string | null> {
  const direct = path.join(appdataBase, containerName)
  if (await exists(direct)) return direct

  try {
    const entries = await fs.readdir(appdataBase, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const candidate = path.join(appdataBase, entry.name, containerName)
      if (await exists(candidate)) return candidate
    }
  } catch { /* appdataBase may not exist */ }

  return null
}

/** Find all tar.gz files belonging to a container (format: containerName_*.tar.gz). */
async function findContainerTarFiles(appdataBase: string, containerName: string): Promise<string[]> {
  const prefix = `${containerName}_`
  const searchDirs: string[] = [appdataBase]

  // Also search one level of date subdirs
  try {
    const entries = await fs.readdir(appdataBase, { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory()) searchDirs.push(path.join(appdataBase, e.name))
    }
  } catch { /* ok */ }

  for (const dir of searchDirs) {
    try {
      const files = await fs.readdir(dir)
      const matches = files.filter(f => f.startsWith(prefix) && f.endsWith('.tar.gz'))
      if (matches.length > 0) return matches.map(f => path.join(dir, f))
    } catch { /* ok */ }
  }

  return []
}

/** Extract a tar.gz archive into destDir (archive contains the dir itself, e.g. config/...). */
async function extractTarArchive(tarFile: string, destDir: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('tar', ['-xzf', tarFile, '-C', destDir])
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', code =>
      code === 0 ? resolve() : reject(new Error(`tar extract failed (code ${code}): ${stderr.trim()}`))
    )
    proc.on('error', reject)
  })
}

async function exists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true).catch(() => false)
}

// PostgreSQL requires these dirs to exist in the data directory even if empty.
// After rsync restore they may be missing if they were empty during backup.
const PG_REQUIRED_DIRS = [
  'pg_commit_ts', 'pg_dynshmem', 'pg_notify', 'pg_replslot',
  'pg_serial', 'pg_snapshots', 'pg_stat', 'pg_stat_tmp',
  'pg_subtrans', 'pg_tblspc', 'pg_twophase',
  'pg_logical/mappings', 'pg_logical/snapshots',
  'pg_multixact/members', 'pg_multixact/offsets',
]

/** Recursively scan targetDir for PG_VERSION files and ensure all required dirs exist. */
async function ensurePostgresDataDirs(baseDir: string): Promise<void> {
  // Walk up to 2 levels deep (containerName/ or containerName/data/)
  const candidates: string[] = [baseDir]
  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory()) candidates.push(path.join(baseDir, e.name))
    }
  } catch { return }

  for (const dir of candidates) {
    const pgVersion = path.join(dir, 'PG_VERSION')
    if (!await exists(pgVersion)) continue
    logger.info(`[restore] detected PostgreSQL data dir: ${dir} — ensuring required subdirs`)
    for (const rel of PG_REQUIRED_DIRS) {
      await fs.mkdir(path.join(dir, rel), { recursive: true })
    }
  }
}

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args)
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args[0]} failed with code ${code}: ${stderr.trim()}`))
    })
    proc.on('error', reject)
  })
}
