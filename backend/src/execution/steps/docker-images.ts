import type { JobExecutionEngine } from '../engine.js'
import { getEncryptionPassword } from '../../utils/encryptionKey.js'
import { encryptFileGPG } from '../../utils/gpgEncrypt.js'
import { saveImage } from '../../docker/client.js'
import { parseNasConfig, createNasTempDir, transferAndCleanup } from './nasTransfer.js'
import path from 'path'
import fs from 'fs/promises'

export interface DockerImageExportConfig {
  images: string[]
  destination: string
  targetId: string
  useEncryption: boolean
}

async function exportDockerImage(
  imageName: string,
  destPath: string,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', `Exporting Docker image: ${imageName}`)
  const outputFile = path.join(destPath, `${imageName.replace(/[:/]/g, '_')}.tar`)
  await saveImage(imageName, outputFile)
  const stats = await fs.stat(outputFile)
  engine.log('info', 'file', `Image exported: ${imageName}`, undefined, {
    file: { path: outputFile, size: stats.size, result: 'copied' },
  })
}

export async function executeDockerImageExport(
  config: DockerImageExportConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', 'Starting Docker image export')

  const { db } = await import('../../db/database.js')
  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as { type: string; config: string } | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  let targetConfig: { path: string }
  try {
    targetConfig = JSON.parse(target.config) as { path: string }
  } catch {
    throw new Error(`Invalid target config JSON for target ${config.targetId}`)
  }

  const nasConfig = await parseNasConfig(target)
  const destPath = path.join(targetConfig.path, 'docker-images', new Date().toISOString().split('T')[0])
  const workDir = nasConfig ? await createNasTempDir('docker-images') : destPath
  if (!nasConfig) await fs.mkdir(destPath, { recursive: true })

  engine.log('info', 'system', `Exporting ${config.images.length} Docker images to ${destPath}`)

  for (const imageName of config.images) {
    try {
      await exportDockerImage(imageName, workDir, engine)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined
      engine.log('error', 'system', `Failed to export image ${imageName}: ${message}`, undefined, {
        error: { code: 'IMAGE_EXPORT_FAILED', stack, suggestion: 'Check if image exists and Docker daemon is running' },
      })
    }
  }

  const manifest = {
    images: config.images,
    exportDate: new Date().toISOString(),
    destination: destPath,
  }

  await fs.writeFile(path.join(workDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  if (config.useEncryption) {
    engine.log('info', 'system', 'Encrypting Docker images...')
    try {
      const encryptionPassword = getEncryptionPassword()
      const entries = await fs.readdir(workDir)

      for (const file of entries) {
        if (!file.endsWith('.tar')) continue
        const tarPath = path.join(workDir, file)
        const encryptedPath = `${tarPath}.gpg`
        await encryptFileGPG(tarPath, encryptedPath, encryptionPassword)
        await fs.unlink(tarPath)
        engine.log('info', 'system', `Encrypted: ${file}`)
      }

      engine.log('info', 'system', 'Docker images encrypted')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      engine.log('error', 'system', `Docker image encryption failed: ${msg}`)
      throw err
    }
  }

  const nasChecksums = nasConfig ? await transferAndCleanup(workDir, destPath, nasConfig, engine) : undefined
  engine.recordBackupPath('docker_images', destPath, config.targetId, nasChecksums)
  engine.log('info', 'system', 'Docker image export completed')
}
