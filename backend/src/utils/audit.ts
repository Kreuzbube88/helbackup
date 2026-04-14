import { randomUUID } from 'crypto'
import { db } from '../db/database.js'

export function auditLog(
  action: string,
  actor: string | null,
  resourceType: string,
  resourceId: string,
  details?: Record<string, unknown>
): void {
  db.prepare(
    'INSERT INTO audit_log (id, timestamp, action, actor, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    randomUUID(),
    new Date().toISOString(),
    action,
    actor ?? 'system',
    resourceType,
    resourceId,
    details ? JSON.stringify(details) : null
  )
}
