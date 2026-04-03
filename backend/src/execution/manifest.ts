import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import { db } from '../db/database.js'
import { exportHELBACKUP } from './steps/helbackup-export.js'
import { generateChecksums } from './verification.js'
import type { ChecksumEntry } from './verification.js'
import type { JobExecutionEngine } from './engine.js'

export interface ManifestEntry {
  path: string
  size: number
}

export interface Manifest {
  backupId: string
  jobId: string
  runId: string
  timestamp: string
  helbackupVersion: string
  entries: ManifestEntry[]
  containerConfigs?: unknown[]
  helbackupExport: string
  checksums: ChecksumEntry[]
  verified: boolean
  lastVerified?: string
}

export async function createManifest(
  jobId: string,
  runId: string,
  backupPath: string,
  engine: JobExecutionEngine,
  generateChecksumsEnabled = true
): Promise<Manifest> {
  engine.log('info', 'system', 'Creating backup manifest...')

  const helbackupExportPath = await exportHELBACKUP(backupPath, engine)

  const entries: ManifestEntry[] = []
  await scanDir(backupPath, backupPath, entries)

  let containerConfigs: unknown[] | undefined
  try {
    const raw = await fs.readFile(path.join(backupPath, 'containers.json'), 'utf-8')
    containerConfigs = JSON.parse(raw) as unknown[]
  } catch {
    // no container configs — that's fine
  }

  const checksums: ChecksumEntry[] = generateChecksumsEnabled
    ? await generateChecksums(backupPath, engine)
    : []

  const manifest: Manifest = {
    backupId: randomUUID(),
    jobId,
    runId,
    timestamp: new Date().toISOString(),
    helbackupVersion: 'v1.0',
    entries,
    containerConfigs,
    helbackupExport: path.relative(backupPath, helbackupExportPath),
    checksums,
    verified: false,
    lastVerified: undefined,
  }

  await fs.writeFile(path.join(backupPath, 'manifest.json'), JSON.stringify(manifest, null, 2))

  db.prepare(
    'INSERT INTO manifest (backup_id, job_id, manifest, created_at) VALUES (?, ?, ?, ?)'
  ).run(manifest.backupId, jobId, JSON.stringify(manifest), manifest.timestamp)

  engine.log('info', 'system', `Manifest created: ${entries.length} files`)
  return manifest
}

async function scanDir(dir: string, baseDir: string, entries: ManifestEntry[]): Promise<void> {
  const items = await fs.readdir(dir, { withFileTypes: true })
  for (const item of items) {
    const full = path.join(dir, item.name)
    if (item.isDirectory()) {
      await scanDir(full, baseDir, entries)
    } else {
      const stats = await fs.stat(full)
      entries.push({ path: path.relative(baseDir, full), size: stats.size })
    }
  }
}
