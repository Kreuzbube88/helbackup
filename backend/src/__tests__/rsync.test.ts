import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'

// --- mocks ----------------------------------------------------------------

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}))
vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { spawn } from 'child_process'
import { executeRsync } from '../tools/rsync.js'

// Helper: create a fake rsync child process that emits the given exit code
function fakeRsync(exitCode: number, stdout = '', stderr = '') {
  const proc = new EventEmitter() as ReturnType<typeof spawn>
  ;(proc as unknown as { stdout: EventEmitter; stderr: EventEmitter }).stdout = new EventEmitter()
  ;(proc as unknown as { stdout: EventEmitter; stderr: EventEmitter }).stderr = new EventEmitter()

  setImmediate(() => {
    if (stdout) (proc as unknown as { stdout: EventEmitter }).stdout.emit('data', Buffer.from(stdout))
    if (stderr) (proc as unknown as { stderr: EventEmitter }).stderr.emit('data', Buffer.from(stderr))
    proc.emit('close', exitCode)
  })

  return proc
}

beforeEach(() => {
  vi.mocked(spawn).mockReset()
})

// ---------------------------------------------------------------------------

describe('executeRsync — exit code handling', () => {
  it('resolves on exit 0', async () => {
    vi.mocked(spawn).mockReturnValue(fakeRsync(0) as ReturnType<typeof spawn>)
    const result = await executeRsync({ source: '/src/', destination: '/dst' })
    expect(result.success).toBe(true)
  })

  it('resolves on exit 23 (non-strict)', async () => {
    vi.mocked(spawn).mockReturnValue(fakeRsync(23) as ReturnType<typeof spawn>)
    const result = await executeRsync({ source: '/src/', destination: '/dst' })
    expect(result.success).toBe(true)
  })

  it('resolves on exit 24 (non-strict)', async () => {
    vi.mocked(spawn).mockReturnValue(fakeRsync(24) as ReturnType<typeof spawn>)
    const result = await executeRsync({ source: '/src/', destination: '/dst' })
    expect(result.success).toBe(true)
  })

  it('rejects on exit 1', async () => {
    vi.mocked(spawn).mockReturnValue(fakeRsync(1) as ReturnType<typeof spawn>)
    await expect(executeRsync({ source: '/src/', destination: '/dst' })).rejects.toThrow()
  })

  it('rejects on exit 23 when strict:true', async () => {
    vi.mocked(spawn).mockReturnValue(fakeRsync(23) as ReturnType<typeof spawn>)
    await expect(
      executeRsync({ source: '/src/', destination: '/dst', strict: true })
    ).rejects.toThrow('partial transfer')
  })

  it('rejects on exit 24 when strict:true', async () => {
    vi.mocked(spawn).mockReturnValue(fakeRsync(24) as ReturnType<typeof spawn>)
    await expect(
      executeRsync({ source: '/src/', destination: '/dst', strict: true })
    ).rejects.toThrow('vanished')
  })
})

describe('executeRsync — command construction', () => {
  it('includes --bwlimit when bwLimit set', async () => {
    vi.mocked(spawn).mockReturnValue(fakeRsync(0) as ReturnType<typeof spawn>)
    await executeRsync({ source: '/src/', destination: '/dst', bwLimit: 50000 })
    const args = vi.mocked(spawn).mock.calls[0][1] as string[]
    expect(args).toContain('--bwlimit=50000')
  })

  it('includes --exclude for each pattern', async () => {
    vi.mocked(spawn).mockReturnValue(fakeRsync(0) as ReturnType<typeof spawn>)
    await executeRsync({ source: '/src/', destination: '/dst', excludePatterns: ['*.log', 'cache/'] })
    const args = vi.mocked(spawn).mock.calls[0][1] as string[]
    expect(args).toContain('--exclude=*.log')
    expect(args).toContain('--exclude=cache/')
  })

  it('redacts SSH key path from logged args (contains ***)', async () => {
    vi.mocked(spawn).mockReturnValue(fakeRsync(0) as ReturnType<typeof spawn>)
    const { logger } = await import('../utils/logger.js')
    await executeRsync({
      source: '/src/',
      destination: '/dst',
      sshHost: 'nas.local',
      sshUser: 'admin',
      sshKey: '/app/config/ssh/nas_key',
    })
    const logCall = vi.mocked(logger.info).mock.calls.find(c => String(c[0]).includes('rsync'))
    expect(logCall).toBeDefined()
    expect(String(logCall![0])).not.toContain('/app/config/ssh/nas_key')
    expect(String(logCall![0])).toContain("'***'")
  })

  it('uses StrictHostKeyChecking=no without known_hosts', async () => {
    vi.mocked(spawn).mockReturnValue(fakeRsync(0) as ReturnType<typeof spawn>)
    await executeRsync({
      source: '/src/',
      destination: '/dst',
      sshHost: 'nas.local',
      sshUser: 'admin',
      sshKey: '/some/key',
    })
    const args = vi.mocked(spawn).mock.calls[0][1] as string[]
    const rsh = args.find(a => a.startsWith('--rsh='))
    expect(rsh).toContain('StrictHostKeyChecking=no')
  })

  it('passes --files-from when filesFrom set', async () => {
    vi.mocked(spawn).mockReturnValue(fakeRsync(0) as ReturnType<typeof spawn>)
    await executeRsync({ source: '/src/', destination: '/dst', filesFrom: '/tmp/list.txt' })
    const args = vi.mocked(spawn).mock.calls[0][1] as string[]
    expect(args).toContain('--files-from=/tmp/list.txt')
  })
})

describe('executeRsync — stats parsing', () => {
  it('parses Total transferred file size', async () => {
    const stdout = 'Total transferred file size: 1,234,567 bytes\nNumber of regular files transferred: 42\n'
    vi.mocked(spawn).mockReturnValue(fakeRsync(0, stdout) as ReturnType<typeof spawn>)
    const result = await executeRsync({ source: '/src/', destination: '/dst' })
    expect(result.bytesTransferred).toBe(1234567)
    expect(result.filesTransferred).toBe(42)
  })
})
