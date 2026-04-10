import path from 'path'
import fs from 'fs/promises'
import { spawn } from 'node:child_process'
import { inspectContainer, dockerExecToFile, getContainerArchive } from '../../docker/client.js'
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
  engine.log('info', 'system', `Creating PostgreSQL dump for container ${containerId}`)
  const dumpFile = path.join(outputPath, 'postgres_dump.sql')
  const { stderr, exitCode } = await dockerExecToFile(
    containerId, ['pg_dumpall', '-U', 'postgres'], dumpFile
  )
  if (exitCode !== 0) {
    engine.log('error', 'system', `PostgreSQL dump failed: ${stderr}`)
    throw new Error(`pg_dumpall failed with exit code ${exitCode}`)
  }
  const stats = await fs.stat(dumpFile)
  engine.log('info', 'file', `PostgreSQL dump created: ${dumpFile}`, undefined, {
    file: { path: dumpFile, size: stats.size, result: 'copied' },
  })
}

async function dumpMySQL(containerId: string, outputPath: string, engine: JobExecutionEngine): Promise<void> {
  engine.log('info', 'system', `Creating MySQL dump for container ${containerId}`)
  const dumpFile = path.join(outputPath, 'mysql_dump.sql')
  const { stderr, exitCode } = await dockerExecToFile(
    containerId,
    ['sh', '-c', 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --all-databases'],
    dumpFile
  )
  if (exitCode !== 0) {
    engine.log('error', 'system', `MySQL dump failed: ${stderr}`)
    throw new Error(`mysqldump failed with exit code ${exitCode}`)
  }
  const stats = await fs.stat(dumpFile)
  engine.log('info', 'file', `MySQL dump created: ${dumpFile}`, undefined, {
    file: { path: dumpFile, size: stats.size, result: 'copied' },
  })
}

async function dumpMongoDB(containerId: string, outputPath: string, engine: JobExecutionEngine): Promise<void> {
  engine.log('info', 'system', `Creating MongoDB dump for container ${containerId}`)

  // Run mongodump inside the container — writes to /tmp/mongodump (stdout not meaningful)
  const { stderr: dumpStderr, exitCode: dumpExit } = await dockerExecToFile(
    containerId, ['mongodump', '--out', '/tmp/mongodump'], '/dev/null'
  )
  if (dumpExit !== 0) {
    engine.log('error', 'system', `MongoDB dump failed: ${dumpStderr}`)
    throw new Error(`mongodump failed with exit code ${dumpExit}`)
  }

  // Extract via Docker archive API (returns tar stream), unpack with system tar
  const dumpDir = path.join(outputPath, 'mongodb_dump')
  await fs.mkdir(dumpDir, { recursive: true })
  const tarStream = await getContainerArchive(containerId, '/tmp/mongodump')

  await new Promise<void>((resolve, reject) => {
    const tar = spawn('tar', ['-x', '-C', dumpDir])
    tarStream.pipe(tar.stdin)
    tar.on('close', (code: number | null) =>
      code === 0 ? resolve() : reject(new Error(`tar extract failed with code ${code}`))
    )
    tar.on('error', reject)
  })

  engine.log('info', 'file', `MongoDB dump extracted: ${dumpDir}`, undefined, {
    file: { path: dumpDir, size: 0, result: 'copied' },
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
