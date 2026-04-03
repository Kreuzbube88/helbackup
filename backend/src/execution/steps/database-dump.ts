import path from 'path'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { spawn } from 'child_process'
import { inspectContainer } from '../../docker/client.js'
import type { JobExecutionEngine } from '../engine.js'

export type DatabaseType = 'postgres' | 'mysql' | 'mariadb' | 'mongodb' | 'redis' | 'unknown'

export interface DatabaseDumpConfig {
  containerId: string
  type: DatabaseType
  outputPath: string
}

export function detectDatabaseType(containerName: string, image: string): DatabaseType {
  const imageLower = image.toLowerCase()
  const nameLower = containerName.toLowerCase()

  if (imageLower.includes('postgres') || nameLower.includes('postgres')) return 'postgres'
  if (imageLower.includes('mysql') || nameLower.includes('mysql')) return 'mysql'
  if (imageLower.includes('mariadb') || nameLower.includes('mariadb')) return 'mariadb'
  if (imageLower.includes('mongo') || nameLower.includes('mongo')) return 'mongodb'
  if (imageLower.includes('redis') || nameLower.includes('redis')) return 'redis'

  return 'unknown'
}

async function dumpPostgres(containerId: string, outputPath: string, engine: JobExecutionEngine): Promise<void> {
  return new Promise((resolve, reject) => {
    engine.log('info', 'system', `Creating PostgreSQL dump for container ${containerId}`)

    const dumpFile = path.join(outputPath, 'postgres_dump.sql')
    const docker = spawn('docker', ['exec', containerId, 'pg_dumpall', '-U', 'postgres'])
    const writeStream = createWriteStream(dumpFile)

    docker.stdout.pipe(writeStream)

    let errorOutput = ''
    docker.stderr.on('data', (data: Buffer) => { errorOutput += data.toString() })

    docker.on('close', async (code: number | null) => {
      writeStream.close()
      if (code === 0) {
        try {
          const stats = await fs.stat(dumpFile)
          engine.log('info', 'file', `PostgreSQL dump created: ${dumpFile}`, undefined, {
            file: { path: dumpFile, size: stats.size, result: 'copied' }
          })
          resolve()
        } catch (statErr: unknown) {
          reject(statErr)
        }
      } else {
        engine.log('error', 'system', `PostgreSQL dump failed: ${errorOutput}`)
        reject(new Error(`pg_dumpall failed with code ${code}`))
      }
    })

    docker.on('error', reject)
  })
}

async function dumpMySQL(containerId: string, outputPath: string, engine: JobExecutionEngine): Promise<void> {
  return new Promise((resolve, reject) => {
    engine.log('info', 'system', `Creating MySQL dump for container ${containerId}`)

    const dumpFile = path.join(outputPath, 'mysql_dump.sql')
    const docker = spawn('docker', [
      'exec', containerId,
      'sh', '-c', 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --all-databases',
    ])
    const writeStream = createWriteStream(dumpFile)

    docker.stdout.pipe(writeStream)

    let errorOutput = ''
    docker.stderr.on('data', (data: Buffer) => { errorOutput += data.toString() })

    docker.on('close', async (code: number | null) => {
      writeStream.close()
      if (code === 0) {
        try {
          const stats = await fs.stat(dumpFile)
          engine.log('info', 'file', `MySQL dump created: ${dumpFile}`, undefined, {
            file: { path: dumpFile, size: stats.size, result: 'copied' }
          })
          resolve()
        } catch (statErr: unknown) {
          reject(statErr)
        }
      } else {
        engine.log('error', 'system', `MySQL dump failed: ${errorOutput}`)
        reject(new Error(`mysqldump failed with code ${code}`))
      }
    })

    docker.on('error', reject)
  })
}

async function dumpMongoDB(containerId: string, outputPath: string, engine: JobExecutionEngine): Promise<void> {
  return new Promise((resolve, reject) => {
    engine.log('info', 'system', `Creating MongoDB dump for container ${containerId}`)

    const docker = spawn('docker', ['exec', containerId, 'mongodump', '--out', '/tmp/mongodump'])

    let errorOutput = ''
    docker.stderr.on('data', (data: Buffer) => { errorOutput += data.toString() })

    docker.on('close', (code: number | null) => {
      if (code !== 0) {
        engine.log('error', 'system', `MongoDB dump failed: ${errorOutput}`)
        reject(new Error(`mongodump failed with code ${code}`))
        return
      }

      const dumpDir = path.join(outputPath, 'mongodb_dump')
      const dockerCp = spawn('docker', ['cp', `${containerId}:/tmp/mongodump`, dumpDir])

      let cpError = ''
      dockerCp.stderr.on('data', (data: Buffer) => { cpError += data.toString() })

      dockerCp.on('close', (cpCode: number | null) => {
        if (cpCode === 0) {
          engine.log('info', 'file', `MongoDB dump created: ${dumpDir}`, undefined, {
            file: { path: dumpDir, size: 0, result: 'copied' }
          })
          resolve()
        } else {
          reject(new Error(`Failed to copy MongoDB dump: ${cpError}`))
        }
      })

      dockerCp.on('error', reject)
    })

    docker.on('error', reject)
  })
}

export async function executeDatabaseDump(
  config: DatabaseDumpConfig,
  engine: JobExecutionEngine
): Promise<void> {
  await fs.mkdir(config.outputPath, { recursive: true })

  switch (config.type) {
    case 'postgres':
      await dumpPostgres(config.containerId, config.outputPath, engine)
      break
    case 'mysql':
    case 'mariadb':
      await dumpMySQL(config.containerId, config.outputPath, engine)
      break
    case 'mongodb':
      await dumpMongoDB(config.containerId, config.outputPath, engine)
      break
    case 'redis':
      engine.log('warn', 'system', 'Redis dump not implemented — using filesystem backup')
      break
    default:
      engine.log('warn', 'system', `Unknown database type for dump: ${config.type}`)
  }
}

export async function dumpDatabaseContainers(
  containerIds: string[],
  destPath: string,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', 'Creating database dumps before stopping containers...')

  for (const containerId of containerIds) {
    try {
      const details = await inspectContainer(containerId)
      const dbType = detectDatabaseType(details.Name, details.Config.Image)

      if (dbType === 'unknown') {
        engine.log('warn', 'system', `Container ${details.Name} is not a recognized database — skipping dump`)
        continue
      }

      const dumpPath = path.join(destPath, 'database-dumps', containerId)

      await executeDatabaseDump({ containerId, type: dbType, outputPath: dumpPath }, engine)
      engine.log('info', 'system', `Database dump completed for ${details.Name} (${dbType})`)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined
      engine.log('error', 'system', `Failed to dump database ${containerId}: ${msg}`, undefined, {
        error: {
          code: 'DATABASE_DUMP_FAILED',
          stack,
          suggestion: 'Container may not be a database or credentials missing',
        }
      })
    }
  }
}
