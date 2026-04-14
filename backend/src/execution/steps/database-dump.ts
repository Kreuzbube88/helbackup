import path from 'path'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { spawn } from 'node:child_process'
import { inspectContainer, dockerExecToFile, dockerExecToString, getContainerArchive } from '../../docker/client.js'
import type { JobExecutionEngine } from '../engine.js'

export type DatabaseType = 'postgres' | 'mysql' | 'mariadb' | 'mongodb' | 'redis' | 'unknown'

export interface DatabaseDumpConfig {
  containerId: string
  type: DatabaseType
  outputPath: string
  envVars?: string[]  // Container env vars (KEY=VALUE) for credential extraction
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

async function dumpPostgres(containerId: string, outputPath: string, engine: JobExecutionEngine, pgUser: string): Promise<void> {
  engine.log('info', 'system', `Creating PostgreSQL dump for container ${containerId}`)
  const dumpFile = path.join(outputPath, 'postgres_dump.sql')
  const { stderr, exitCode } = await dockerExecToFile(
    containerId, ['pg_dumpall', '-U', pgUser], dumpFile
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

async function dumpMySQL(containerId: string, outputPath: string, engine: JobExecutionEngine, rootPassword: string, appUser: string, appPassword: string, appDatabase: string): Promise<void> {
  engine.log('info', 'system', `Creating MySQL dump for container ${containerId}`)
  const dumpFile = path.join(outputPath, 'mysql_dump.sql')

  // Prefer root + all-databases; fall back to app user + specific DB if no root password
  const cmd = rootPassword
    ? ['mysqldump', '-u', 'root', `--password=${rootPassword}`, '--all-databases']
    : appUser && appDatabase
      ? ['mysqldump', '-u', appUser, ...(appPassword ? [`--password=${appPassword}`] : []), appDatabase]
      : null

  if (!cmd) {
    engine.log('warn', 'system', 'MySQL: no usable credentials found (MYSQL_ROOT_PASSWORD or MYSQL_USER+MYSQL_DATABASE required) — skipping dump')
    return
  }

  if (!rootPassword) {
    engine.log('info', 'system', `MySQL: no root password — dumping database "${appDatabase}" as user "${appUser}"`)
  }

  const { stderr, exitCode } = await dockerExecToFile(containerId, cmd, dumpFile)
  if (exitCode !== 0) {
    engine.log('error', 'system', `MySQL dump failed: ${stderr}`)
    throw new Error(`mysqldump failed with exit code ${exitCode}`)
  }
  const stats = await fs.stat(dumpFile)
  engine.log('info', 'file', `MySQL dump created: ${dumpFile}`, undefined, {
    file: { path: dumpFile, size: stats.size, result: 'copied' },
  })
}

async function dumpMongoDB(containerId: string, outputPath: string, engine: JobExecutionEngine, username: string, password: string): Promise<void> {
  engine.log('info', 'system', `Creating MongoDB dump for container ${containerId}`)

  const authArgs = username ? ['--username', username, '--password', password, '--authenticationDatabase', 'admin'] : []
  // Run mongodump inside the container — writes to /tmp/mongodump (stdout not meaningful)
  const { stderr: dumpStderr, exitCode: dumpExit } = await dockerExecToFile(
    containerId, ['mongodump', ...authArgs, '--out', '/tmp/mongodump'], '/dev/null'
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

  await dockerExecToFile(containerId, ['rm', '-rf', '/tmp/mongodump'], '/dev/null').catch(() => {})

  engine.log('info', 'file', `MongoDB dump extracted: ${dumpDir}`, undefined, {
    file: { path: dumpDir, size: 0, result: 'copied' },
  })
}

async function dumpRedis(containerId: string, outputPath: string, engine: JobExecutionEngine, password: string): Promise<void> {
  engine.log('info', 'system', `Creating Redis dump for container ${containerId}`)
  const dumpFile = path.join(outputPath, 'redis_dump.rdb')
  const authArgs = password ? ['-a', password] : []

  // Get LASTSAVE timestamp before triggering BGSAVE so we can detect completion
  const { stdout: lastSaveBefore } = await dockerExecToString(containerId, ['redis-cli', ...authArgs, 'LASTSAVE'])
  const tsBefore = parseInt(lastSaveBefore.trim(), 10)

  // Trigger background save — returns immediately, save runs in background
  const { stderr: saveStderr, exitCode: saveExit } = await dockerExecToFile(
    containerId, ['redis-cli', ...authArgs, 'BGSAVE'], '/dev/null'
  )
  if (saveExit !== 0) {
    engine.log('error', 'system', `Redis BGSAVE failed: ${saveStderr}`)
    throw new Error(`redis-cli BGSAVE failed with exit code ${saveExit}`)
  }

  // Poll LASTSAVE until timestamp advances (max 30s) — confirms RDB is fully written
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 1000))
    const { stdout: lastSaveNow } = await dockerExecToString(containerId, ['redis-cli', ...authArgs, 'LASTSAVE'])
    const tsNow = parseInt(lastSaveNow.trim(), 10)
    if (!isNaN(tsBefore) && !isNaN(tsNow) && tsNow > tsBefore) break
    engine.log('info', 'system', 'Redis: waiting for BGSAVE to complete...')
  }

  // Export RDB via Docker archive API — default RDB path is /data/dump.rdb
  const tarStream = await getContainerArchive(containerId, '/data/dump.rdb')
  await new Promise<void>((resolve, reject) => {
    const tar = spawn('tar', ['-xO'])  // extract single file to stdout
    const out = createWriteStream(dumpFile)
    tarStream.pipe(tar.stdin)
    tar.stdout.pipe(out)
    tar.on('close', (code: number | null) =>
      code === 0 ? resolve() : reject(new Error(`tar extract failed with code ${code}`))
    )
    tar.on('error', reject)
    out.on('error', reject)
  })
  const stats = await fs.stat(dumpFile)
  engine.log('info', 'file', `Redis dump created: ${dumpFile}`, undefined, {
    file: { path: dumpFile, size: stats.size, result: 'copied' },
  })
}

function getEnvVar(envVars: string[], ...keys: string[]): string {
  for (const key of keys) {
    const val = envVars.find(e => e.startsWith(`${key}=`))?.slice(key.length + 1)
    if (val) return val
  }
  return ''
}

export async function executeDatabaseDump(
  config: DatabaseDumpConfig,
  engine: JobExecutionEngine
): Promise<void> {
  await fs.mkdir(config.outputPath, { recursive: true })
  const env = config.envVars ?? []

  switch (config.type) {
    case 'postgres': {
      const pgUser = getEnvVar(env, 'POSTGRES_USER') || 'postgres'
      await dumpPostgres(config.containerId, config.outputPath, engine, pgUser)
      break
    }
    case 'mysql':
    case 'mariadb': {
      const rootPassword = getEnvVar(env, 'MYSQL_ROOT_PASSWORD', 'MARIADB_ROOT_PASSWORD')
      const appUser = getEnvVar(env, 'MYSQL_USER', 'MARIADB_USER')
      const appPassword = getEnvVar(env, 'MYSQL_PASSWORD', 'MARIADB_PASSWORD')
      const appDatabase = getEnvVar(env, 'MYSQL_DATABASE', 'MARIADB_DATABASE')
      await dumpMySQL(config.containerId, config.outputPath, engine, rootPassword, appUser, appPassword, appDatabase)
      break
    }
    case 'mongodb': {
      const mongoUser = getEnvVar(env, 'MONGO_INITDB_ROOT_USERNAME')
      const mongoPass = getEnvVar(env, 'MONGO_INITDB_ROOT_PASSWORD')
      await dumpMongoDB(config.containerId, config.outputPath, engine, mongoUser, mongoPass)
      break
    }
    case 'redis': {
      const redisPass = getEnvVar(env, 'REDIS_PASSWORD', 'REQUIREPASS')
      await dumpRedis(config.containerId, config.outputPath, engine, redisPass)
      break
    }
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

      await executeDatabaseDump({ containerId, type: dbType, outputPath: dumpPath, envVars: details.Config.Env }, engine)
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
