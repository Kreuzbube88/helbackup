import { spawn } from 'child_process'
import { JobExecutionEngine } from '../engine.js'
import path from 'path'
import fs from 'fs/promises'

export interface DockerImageExportConfig {
  images: string[]
  destination: string
  targetId: string
}

async function exportDockerImage(
  imageName: string,
  destPath: string,
  engine: JobExecutionEngine
): Promise<void> {
  return new Promise((resolve, reject) => {
    engine.log('info', 'system', `Exporting Docker image: ${imageName}`)

    const outputFile = path.join(destPath, `${imageName.replace(/[:/]/g, '_')}.tar`)
    const docker = spawn('docker', ['save', '-o', outputFile, imageName])

    docker.stderr.on('data', (data: Buffer) => {
      engine.log('debug', 'system', data.toString().trim())
    })

    docker.on('close', async (code: number | null) => {
      if (code === 0) {
        const stats = await fs.stat(outputFile)
        engine.log('info', 'file', `Image exported: ${imageName}`, undefined, {
          file: { path: outputFile, size: stats.size, result: 'copied' },
        })
        resolve()
      } else {
        reject(new Error(`Failed to export image ${imageName}`))
      }
    })

    docker.on('error', reject)
  })
}

export async function executeDockerImageExport(
  config: DockerImageExportConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', 'Starting Docker image export')

  const { db } = await import('../../db/database.js')
  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as { config: string } | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  const targetConfig = JSON.parse(target.config) as { path: string }
  const destPath = path.join(targetConfig.path, 'docker-images', new Date().toISOString().split('T')[0])
  await fs.mkdir(destPath, { recursive: true })

  engine.log('info', 'system', `Exporting ${config.images.length} Docker images to ${destPath}`)

  for (const imageName of config.images) {
    try {
      await exportDockerImage(imageName, destPath, engine)
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

  await fs.writeFile(path.join(destPath, 'manifest.json'), JSON.stringify(manifest, null, 2))

  engine.log('info', 'system', 'Docker image export completed')
}
