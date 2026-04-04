import fs from 'fs/promises'
import path from 'path'
import type { JobExecutionEngine } from './engine.js'
import type { Manifest } from './manifest.js'

export interface ManifestEnvelope {
  backupId: string
  timestamp: string
  encrypted: boolean
  encryptionMethod?: string
  summary: {
    type: string
    containerCount: number
    totalSize: number
    hasDatabase: boolean
  }
}

export async function createManifestEnvelope(
  backupPath: string,
  manifest: Manifest,
  encrypted: boolean,
  engine: JobExecutionEngine
): Promise<void> {
  const envelope: ManifestEnvelope = {
    backupId: manifest.backupId,
    timestamp: manifest.timestamp,
    encrypted,
    encryptionMethod: encrypted ? 'aes-256-gcm+gpg' : undefined,
    summary: {
      type: 'appdata',
      containerCount: manifest.containerConfigs?.length ?? 0,
      totalSize: manifest.entries.reduce((sum, e) => sum + e.size, 0),
      hasDatabase: false,
    },
  }

  const envelopePath = path.join(backupPath, 'manifest-envelope.json')
  await fs.writeFile(envelopePath, JSON.stringify(envelope, null, 2))

  engine.log('info', 'system', `Created manifest envelope: ${envelopePath}`)
}
