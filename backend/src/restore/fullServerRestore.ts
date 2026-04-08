import { type RestorePlan, type RestoreItem } from './restorePlan.js'
import { logger } from '../utils/logger.js'
import { notificationManager } from '../notifications/notificationManager.js'
import { executeRsync } from '../tools/rsync.js'
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
      // Rsync the flash backup directory contents to /boot
      const flashDir = path.join(backupPath, parts[0])
      logger.info(`[restore] flash: ${flashDir}/ → /boot`)
      await executeRsync({
        source: flashDir + '/',
        destination: '/unraid/boot',
        bwLimit: 51200,
        excludePatterns: ['previous/', 'System Volume Information/'],
        onLog: msg => { if (msg.trim()) logger.debug(`[rsync] ${msg.trim()}`) },
      })
      logger.info('[restore] flash: done — reboot required to apply changes')
      break
    }

    case 'appdata': {
      // item.name = "Container: {containerName}"
      const containerName = item.name.replace('Container: ', '')
      // Find the container subdirectory under backupPath/appdata/
      const appdataBase = path.join(backupPath, 'appdata')
      const sourceDir = await resolveContainerDir(appdataBase, containerName)
      const targetDir = path.join('/unraid/user/appdata', containerName)
      await fs.mkdir(targetDir, { recursive: true })
      logger.info(`[restore] appdata: ${sourceDir}/ → ${targetDir}`)
      await executeRsync({
        source: sourceDir + '/',
        destination: targetDir,
        bwLimit: 51200,
        onLog: msg => { if (msg.trim()) logger.debug(`[rsync] ${msg.trim()}`) },
      })
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

/** Resolve the actual container directory under appdataBase, handling optional date subdir. */
async function resolveContainerDir(appdataBase: string, containerName: string): Promise<string> {
  // First try: {appdataBase}/{containerName}
  const direct = path.join(appdataBase, containerName)
  if (await exists(direct)) return direct

  // Second try: {appdataBase}/{dateDir}/{containerName}
  try {
    const entries = await fs.readdir(appdataBase, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const candidate = path.join(appdataBase, entry.name, containerName)
      if (await exists(candidate)) return candidate
    }
  } catch {
    // appdataBase may not exist if backup had no appdata
  }

  throw new Error(`Container dir not found for "${containerName}" under ${appdataBase}`)
}

async function exists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true).catch(() => false)
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
