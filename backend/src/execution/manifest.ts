import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import { db } from '../db/database.js'
import { exportHELBACKUP } from './steps/helbackup-export.js'
import { generateChecksums } from './verification.js'
import { createManifestEnvelope } from './manifestEnvelope.js'
import { encryptFileGPG } from '../utils/gpgEncrypt.js'
import type { ChecksumEntry } from './verification.js'
import type { JobExecutionEngine } from './engine.js'

export interface ManifestEntry {
  path: string
  size: number
}

export interface Manifest {
  schemaVersion: number
  backupId: string
  jobId: string
  runId: string
  targetId?: string
  timestamp: string
  helbackupVersion: string
  backupPath: string
  entries: ManifestEntry[]
  containerConfigs?: unknown[]
  helbackupExport: string
  checksums: ChecksumEntry[]
  verified: boolean
  lastVerified?: string
  encrypted?: boolean
}

export interface CreateManifestOptions {
  generateChecksums?: boolean
  encrypted?: boolean
  encryptionPassword?: string
  targetId?: string
}

export async function createManifest(
  jobId: string,
  runId: string,
  backupPath: string,
  engine: JobExecutionEngine,
  optionsOrBool: boolean | CreateManifestOptions = true
): Promise<Manifest> {
  const options: CreateManifestOptions = typeof optionsOrBool === 'boolean'
    ? { generateChecksums: optionsOrBool }
    : optionsOrBool
  const generateChecksumsEnabled = options.generateChecksums ?? true
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
    schemaVersion: 1,
    backupId: randomUUID(),
    jobId,
    runId,
    targetId: options.targetId,
    timestamp: new Date().toISOString(),
    helbackupVersion: 'v1.0',
    backupPath,
    entries,
    containerConfigs,
    helbackupExport: path.relative(backupPath, helbackupExportPath),
    checksums,
    verified: false,
    lastVerified: undefined,
    encrypted: options.encrypted ?? false,
  }

  const manifestPath = path.join(backupPath, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  // Always create unencrypted envelope for quick inspection
  await createManifestEnvelope(backupPath, manifest, options.encrypted ?? false, engine)

  // Encrypt manifest if requested
  if (options.encrypted && options.encryptionPassword) {
    const encryptedPath = `${manifestPath}.gpg`
    await encryptFileGPG(manifestPath, encryptedPath, options.encryptionPassword)
    await fs.unlink(manifestPath)
    engine.log('info', 'system', 'Manifest encrypted')
  }

  try {
    db.prepare(
      'INSERT INTO manifest (backup_id, job_id, manifest, created_at) VALUES (?, ?, ?, ?)'
    ).run(manifest.backupId, jobId, JSON.stringify(manifest), manifest.timestamp)
  } catch (dbErr) {
    // Compensating: remove orphaned disk files
    await fs.unlink(manifestPath).catch(() => {})
    await fs.unlink(`${manifestPath}.gpg`).catch(() => {})
    await fs.unlink(path.join(backupPath, 'manifest-envelope.json')).catch(() => {})
    throw dbErr
  }

  engine.log('info', 'system', `Manifest created: ${entries.length} files`)
  return manifest
}

export async function createJobManifest(
  jobId: string,
  runId: string,
  stepPaths: Array<{ type: string; path: string; targetId?: string; checksums?: ChecksumEntry[] }>,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', 'Creating job manifest...')

  const allEntries: ManifestEntry[] = []
  for (const { path: stepPath, checksums: precomputed } of stepPaths) {
    if (precomputed) {
      // NAS backup — local temp dir already deleted; derive entries from checksums (have path + size)
      for (const c of precomputed) {
        allEntries.push({ path: c.path, size: c.size })
      }
    } else {
      try {
        await scanDir(stepPath, stepPath, allEntries)
      } catch { /* path might not exist or not be local */ }
    }
  }

  let containerConfigs: unknown[] | undefined
  const appdataStep = stepPaths.find(s => s.type === 'appdata')
  if (appdataStep) {
    try {
      const raw = await fs.readFile(path.join(appdataStep.path, 'containers.json'), 'utf-8')
      containerConfigs = JSON.parse(raw) as unknown[]
    } catch { /* no container configs */ }
  }

  if (stepPaths.length === 0) {
    engine.log('warn', 'system', 'No backup paths recorded — skipping job manifest')
    return
  }

  const allChecksums: ChecksumEntry[] = []
  for (const { path: stepPath, checksums: precomputed } of stepPaths) {
    if (precomputed) {
      // NAS path — checksums were generated from local temp dir before transfer
      allChecksums.push(...precomputed)
      continue
    }
    const localExists = await fs.access(stepPath).then(() => true).catch(() => false)
    if (!localExists) continue
    try {
      const stepChecksums = await generateChecksums(stepPath, engine)
      for (const c of stepChecksums) {
        allChecksums.push({ ...c, path: path.join(stepPath, c.path) })
      }
    } catch (err) {
      engine.log('warn', 'system', `Checksum generation failed for ${stepPath}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const backupId = randomUUID()
  const timestamp = new Date().toISOString()
  const manifest = {
    schemaVersion: 1,
    backupId,
    jobId,
    runId,
    timestamp,
    helbackupVersion: 'v1.0',
    backupPath: stepPaths[0].path,
    stepPaths,
    entries: allEntries,
    containerConfigs,
    checksums: allChecksums,
    verified: false,
  }

  // Write manifest.json to disk so recovery scan can find it
  const manifestJson = JSON.stringify(manifest, null, 2)
  try {
    const manifestPath = path.join(stepPaths[0].path, 'manifest.json')
    await fs.writeFile(manifestPath, manifestJson)
  } catch {
    // Non-critical: DB insert below is the primary storage
  }

  db.prepare(
    'INSERT INTO manifest (backup_id, job_id, manifest, created_at) VALUES (?, ?, ?, ?)'
  ).run(backupId, jobId, manifestJson, timestamp)

  engine.log('info', 'system', `Job manifest created: ${allEntries.length} files across ${stepPaths.length} step(s)`)
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
