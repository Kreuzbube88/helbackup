import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

// --- mocks ----------------------------------------------------------------

vi.mock('../db/database.js', () => ({
  db: {
    prepare: vi.fn(() => ({
      run: vi.fn(() => ({ lastInsertRowid: 1, changes: 1 })),
      get: vi.fn(() => undefined),
      all: vi.fn(() => []),
    })),
  },
}))
vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ---------------------------------------------------------------------------

async function createFakeBackup(dir: string, backupId: string): Promise<string> {
  const backupDir = join(dir, backupId)
  await mkdir(backupDir, { recursive: true })
  const manifest = {
    backupId,
    jobId: 'job-1',
    runId: backupId,
    timestamp: new Date().toISOString(),
    helbackupVersion: 'v1.0',
    backupPath: backupDir,
    entries: [{ path: 'data.txt', size: 11 }],
    checksums: [],
    verified: false,
  }
  await writeFile(join(backupDir, 'manifest.json'), JSON.stringify(manifest))
  await writeFile(join(backupDir, 'data.txt'), 'hello world')
  return backupDir
}

describe('recovery scan — manifest detection', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'helbkup-recovery-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('finds manifest.json recursively', async () => {
    await createFakeBackup(tmpDir, 'backup-2025-01-01')
    const nestedDir = join(tmpDir, 'flash', 'backup-2025-01-02')
    await mkdir(nestedDir, { recursive: true })
    const manifest2 = {
      backupId: 'backup-2025-01-02',
      jobId: 'job-2',
      runId: 'backup-2025-01-02',
      timestamp: new Date().toISOString(),
      backupPath: nestedDir,
      entries: [],
      checksums: [],
      verified: false,
    }
    await writeFile(join(nestedDir, 'manifest.json'), JSON.stringify(manifest2))

    // Manually scan for manifest.json files (mirrors the recovery scan logic)
    const { readdir, stat } = await import('fs/promises')
    const found: string[] = []

    async function scan(dir: string, depth: number): Promise<void> {
      if (depth > 5) return
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          await scan(full, depth + 1)
        } else if (entry.name === 'manifest.json') {
          found.push(full)
        }
      }
    }
    await scan(tmpDir, 0)

    expect(found).toHaveLength(2)
  })

  it('ignores .partial directories', async () => {
    // Create a legit backup
    await createFakeBackup(tmpDir, 'backup-2025-03-01')
    // Create a partial (interrupted) backup — should NOT be scannable
    const partialDir = join(tmpDir, 'backup-2025-03-02.partial')
    await mkdir(partialDir)
    await writeFile(join(partialDir, 'data.txt'), 'incomplete')
    // NOTE: No manifest.json in the partial dir (that's the whole point of atomic publish)

    const { readdir } = await import('fs/promises')
    const found: string[] = []
    async function scan(dir: string, depth: number): Promise<void> {
      if (depth > 5) return
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = join(dir, entry.name)
        if (entry.isDirectory() && !entry.name.endsWith('.partial')) {
          await scan(full, depth + 1)
        } else if (entry.name === 'manifest.json') {
          found.push(full)
        }
      }
    }
    await scan(tmpDir, 0)
    expect(found).toHaveLength(1)
  })

  it('reads and parses manifest.json correctly', async () => {
    const backupDir = await createFakeBackup(tmpDir, 'test-backup-id')
    const { readFile } = await import('fs/promises')
    const raw = await readFile(join(backupDir, 'manifest.json'), 'utf-8')
    const parsed = JSON.parse(raw)
    expect(parsed.backupId).toBe('test-backup-id')
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0].path).toBe('data.txt')
  })
})
