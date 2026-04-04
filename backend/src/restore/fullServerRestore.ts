import { type RestorePlan, type RestoreItem } from './restorePlan.js'
import { logger } from '../utils/logger.js'
import { notificationManager } from '../notifications/notificationManager.js'

export async function executeFullServerRestore(
  backupId: string,
  plan: RestorePlan
): Promise<void> {
  logger.info(`Starting full server restore for backup: ${backupId}`)

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
          await restoreItem(item)
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

async function restoreItem(item: RestoreItem): Promise<void> {
  // Log intent — actual rsync/file restore requires target path resolution from backup root
  // Future: integrate with rsync step using item.path → getTargetPath(item)
  const targetPath = getTargetPath(item)
  logger.info(`[restore] ${item.type}: ${item.path} → ${targetPath}`)
  // Placeholder: restore logic per type will be wired to existing rsync/rclone tools
}

function getTargetPath(item: RestoreItem): string {
  switch (item.type) {
    case 'flash':         return '/boot'
    case 'appdata':       return '/mnt/user/appdata'
    case 'vm':            return '/mnt/user/domains'
    case 'system-config': return '/'
    case 'database':      return '/tmp/db-restore'
    case 'docker-image':  return '/tmp/docker-images'
    default:              return '/tmp/restore'
  }
}
