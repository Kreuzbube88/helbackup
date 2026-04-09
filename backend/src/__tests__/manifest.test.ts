import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

// --- mocks ----------------------------------------------------------------

vi.mock('../db/database.js', () => ({
  db: {
    prepare: vi.fn(() => ({
      run: vi.fn(() => ({ lastInsertRowid: 1 })),
      get: vi.fn(() => undefined),
      all: vi.fn(() => []),
    })),
  },
}))
vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('../execution/steps/helbackup-export.js', () => ({
  exportHELBACKUP: vi.fn().mockResolvedValue('/tmp/fake-export/helbackup-export.tar.gz'),
}))
vi.mock('../execution/manifestEnvelope.js', () => ({
  createManifestEnvelope: vi.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------------------------

describe('generateChecksums + verifyChecksums — local round-trip', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'helbkup-test-'))
    await writeFile(join(tmpDir, 'file1.txt'), 'hello world')
    await writeFile(join(tmpDir, 'file2.txt'), 'second file content')
    await mkdir(join(tmpDir, 'subdir'))
    await writeFile(join(tmpDir, 'subdir', 'nested.txt'), 'nested content')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('generates checksums for all files including nested', async () => {
    const engineMock = {
      log: vi.fn(),
      emit: vi.fn(),
      addTransferred: vi.fn(),
      recordBackupPath: vi.fn(),
    }
    const { generateChecksums } = await import('../execution/verification.js')
    const checksums = await generateChecksums(tmpDir, engineMock as never)
    expect(checksums).toHaveLength(3)
    const paths = checksums.map(c => c.path)
    expect(paths).toContain('file1.txt')
    expect(paths).toContain('file2.txt')
    expect(paths).toContain(join('subdir', 'nested.txt'))
  })

  it('verifyChecksums passes when files are unchanged', async () => {
    const engineMock = { log: vi.fn(), emit: vi.fn() }
    const { generateChecksums, verifyChecksums } = await import('../execution/verification.js')
    const checksums = await generateChecksums(tmpDir, engineMock as never)
    const result = await verifyChecksums(tmpDir, checksums, engineMock as never)
    expect(result.passed).toBe(3)
    expect(result.failed).toBe(0)
    expect(result.missing).toBe(0)
  })

  it('verifyChecksums detects a tampered file', async () => {
    const engineMock = { log: vi.fn(), emit: vi.fn() }
    const { generateChecksums, verifyChecksums } = await import('../execution/verification.js')
    const checksums = await generateChecksums(tmpDir, engineMock as never)
    // Tamper with file1.txt after checksums were generated
    await writeFile(join(tmpDir, 'file1.txt'), 'tampered content!')
    const result = await verifyChecksums(tmpDir, checksums, engineMock as never)
    expect(result.failed).toBe(1)
    expect(result.passed).toBe(2)
  })

  it('verifyChecksums reports missing file', async () => {
    const engineMock = { log: vi.fn(), emit: vi.fn() }
    const { generateChecksums, verifyChecksums } = await import('../execution/verification.js')
    const checksums = await generateChecksums(tmpDir, engineMock as never)
    await rm(join(tmpDir, 'file2.txt'))
    const result = await verifyChecksums(tmpDir, checksums, engineMock as never)
    expect(result.missing).toBe(1)
  })
})

describe('finalizeLocalBackup — atomic rename', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'helbkup-atomic-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('renames .partial dir to final dest', async () => {
    const { finalizeLocalBackup } = await import('../execution/steps/nasTransfer.js')
    const engineMock = { log: vi.fn() }
    const partialDir = join(tmpDir, 'backup.partial')
    const finalDir = join(tmpDir, 'backup')
    await mkdir(partialDir)
    await writeFile(join(partialDir, 'data.txt'), 'content')

    await finalizeLocalBackup(partialDir, finalDir, engineMock as never)

    const { access } = await import('fs/promises')
    await expect(access(finalDir)).resolves.toBeUndefined()
    await expect(access(partialDir)).rejects.toThrow()
  })

  it('removes existing final dir before rename (same-day re-run)', async () => {
    const { finalizeLocalBackup } = await import('../execution/steps/nasTransfer.js')
    const engineMock = { log: vi.fn() }
    const partialDir = join(tmpDir, 'run2.partial')
    const finalDir = join(tmpDir, 'run2')
    await mkdir(partialDir)
    await writeFile(join(partialDir, 'new.txt'), 'new')
    await mkdir(finalDir)
    await writeFile(join(finalDir, 'old.txt'), 'old')

    await finalizeLocalBackup(partialDir, finalDir, engineMock as never)

    const { readdir } = await import('fs/promises')
    const files = await readdir(finalDir)
    expect(files).toContain('new.txt')
    expect(files).not.toContain('old.txt')
  })
})
