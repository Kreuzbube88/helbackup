import path from 'path'
import fs from 'fs/promises'
import { db } from '../../db/database.js'
import { createTarArchive } from '../../tools/tar.js'
import type { JobExecutionEngine } from '../engine.js'

const DB_PATH = process.env.DB_PATH ?? '/app/data/helbackup.db'

export async function exportHELBACKUP(destPath: string, engine: JobExecutionEngine): Promise<string> {
  engine.log('info', 'Exporting HELBACKUP configuration...')

  const exportDir = '/tmp/helbackup-export'
  await fs.mkdir(exportDir, { recursive: true })

  // ACID-safe DB snapshot while running
  const backupDbPath = path.join(exportDir, 'helbackup.db')
  engine.log('info', 'Creating database snapshot (VACUUM INTO)...')
  db.prepare(`VACUUM INTO ?`).run(backupDbPath)
  engine.log('info', 'Database snapshot created')

  // Copy SSH keys if present
  const sshSrc = '/app/config/ssh'
  try {
    await fs.access(sshSrc)
    await fs.cp(sshSrc, path.join(exportDir, 'ssh'), { recursive: true })
    engine.log('info', 'SSH keys exported')
  } catch {
    engine.log('info', 'No SSH keys to export')
  }

  // Metadata
  await fs.writeFile(
    path.join(exportDir, 'metadata.json'),
    JSON.stringify({ version: 'v1.0', exportDate: new Date().toISOString(), database: 'helbackup.db', sshKeys: 'ssh/' }, null, 2)
  )

  const tarPath = path.join(destPath, 'helbackup-export.tar.gz')
  await createTarArchive({ source: exportDir, destination: tarPath, compress: true })

  await fs.rm(exportDir, { recursive: true, force: true })

  engine.log('info', `HELBACKUP export: ${tarPath}`)
  return tarPath
}
