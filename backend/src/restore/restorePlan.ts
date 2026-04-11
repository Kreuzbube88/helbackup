import { db } from '../db/database.js'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger.js'
import { safeJsonParseOrThrow } from '../utils/safeJson.js'

const execFileAsync = promisify(execFile)

export interface RestoreItem {
  type: 'flash' | 'appdata' | 'vm' | 'docker-image' | 'system-config' | 'database'
  name: string
  path: string
  size: number
  priority: number // 1 = highest
  dependencies: string[]
  warnings: string[]
}

export interface RestorePlan {
  backupId: string
  timestamp: string
  backupPath: string
  items: RestoreItem[]
  totalSize: number
  estimatedDuration: number // seconds
  executionOrder: RestoreItem[][]
  preFlightChecks: {
    diskSpace: {
      required: number
      available: number
      sufficient: boolean
    }
    conflicts: {
      type: string
      name: string
      message: string
    }[]
    warnings: string[]
  }
}

export interface RestoreOptions {
  includeFlash?: boolean
  includeAppdata?: boolean
  includeVMs?: boolean
  includeDockerImages?: boolean
  includeSystemConfig?: boolean
  includeDatabases?: boolean
}

interface ManifestEntry {
  path: string
  size?: number
}

interface ContainerConfig {
  id?: string
  name: string
  image?: string
  env?: Record<string, string>
  ports?: Record<string, unknown>
  networks?: string[]
}

interface DatabaseDump {
  type: string
  container: string
  path: string
  size?: number
}

interface StoredManifest {
  backupId: string
  timestamp: string
  backupPath?: string
  entries?: ManifestEntry[]
  containerConfigs?: ContainerConfig[]
  databaseDumps?: DatabaseDump[]
}

interface ManifestRow {
  backup_id: string
  manifest: string
}

export async function generateRestorePlan(
  backupId: string,
  options: RestoreOptions = {}
): Promise<RestorePlan> {
  logger.info(`Generating restore plan for backup: ${backupId}`)

  const row = db.prepare('SELECT * FROM manifest WHERE backup_id = ?').get(backupId) as ManifestRow | undefined
  if (!row) {
    throw new Error(`Manifest not found for backup ID: ${backupId}`)
  }

  const manifest = safeJsonParseOrThrow<StoredManifest>(row.manifest, 'restore plan manifest')
  const items: RestoreItem[] = []
  let totalSize = 0

  // 1. Flash Drive
  if (options.includeFlash !== false) {
    const flashEntry = manifest.entries?.find(e => e.path.includes('flash'))
    if (flashEntry) {
      items.push({
        type: 'flash',
        name: 'Flash Drive (Boot Config)',
        path: flashEntry.path,
        size: flashEntry.size ?? 0,
        priority: 1,
        dependencies: [],
        warnings: ['Requires reboot after restore'],
      })
      totalSize += flashEntry.size ?? 0
    }
  }

  // 2. System Config
  if (options.includeSystemConfig !== false) {
    const configEntry = manifest.entries?.find(e => e.path.includes('system-config'))
    if (configEntry) {
      items.push({
        type: 'system-config',
        name: 'System Configuration',
        path: configEntry.path,
        size: configEntry.size ?? 0,
        priority: 2,
        dependencies: [],
        warnings: ['Network settings may need adjustment'],
      })
      totalSize += configEntry.size ?? 0
    }
  }

  // 3. Database dumps
  if (options.includeDatabases !== false && manifest.databaseDumps) {
    for (const dump of manifest.databaseDumps) {
      items.push({
        type: 'database',
        name: `Database: ${dump.type} (${dump.container})`,
        path: dump.path,
        size: dump.size ?? 0,
        priority: 3,
        dependencies: [],
        warnings: [`Must restore before ${dump.container} starts`],
      })
      totalSize += dump.size ?? 0
    }
  }

  // 4. Appdata (with dependency detection)
  if (options.includeAppdata !== false && manifest.containerConfigs) {
    const containerDeps = detectContainerDependencies(manifest.containerConfigs)

    for (const container of manifest.containerConfigs) {
      // Match rsync structure (appdata/<containerName>/...) OR tar structure (appdata/<date>/<containerName>_*.tar.gz[.gpg])
      const appdataEntry = manifest.entries?.find(e =>
        e.path.includes('appdata/') &&
        (e.path.includes(`/${container.name}/`) || e.path.includes(`/${container.name}_`))
      )
      if (appdataEntry) {
        items.push({
          type: 'appdata',
          name: `Container: ${container.name}`,
          path: appdataEntry.path,
          size: appdataEntry.size ?? 0,
          priority: getPriority(container.name, containerDeps),
          dependencies: containerDeps.get(container.name) ?? [],
          warnings: getContainerWarnings(container),
        })
        totalSize += appdataEntry.size ?? 0
      }
    }
  }

  // 5. VMs
  if (options.includeVMs !== false) {
    const vmEntries = manifest.entries?.filter(e => e.path.includes('vms/')) ?? []
    for (const vmEntry of vmEntries) {
      const vmName = vmEntry.path.split('/').pop()?.replace('.xml', '') ?? vmEntry.path
      items.push({
        type: 'vm',
        name: `VM: ${vmName}`,
        path: vmEntry.path,
        size: vmEntry.size ?? 0,
        priority: 6,
        dependencies: [],
        warnings: ['VM disk images must be restored separately'],
      })
      totalSize += vmEntry.size ?? 0
    }
  }

  // 6. Docker Images
  if (options.includeDockerImages !== false) {
    const imageEntries = manifest.entries?.filter(e => e.path.includes('docker-images/')) ?? []
    for (const imageEntry of imageEntries) {
      const imageName = imageEntry.path.split('/').pop()?.replace('.tar', '') ?? imageEntry.path
      items.push({
        type: 'docker-image',
        name: `Image: ${imageName}`,
        path: imageEntry.path,
        size: imageEntry.size ?? 0,
        priority: 5,
        dependencies: [],
        warnings: [],
      })
      totalSize += imageEntry.size ?? 0
    }
  }

  const executionOrder = generateExecutionOrder(items)
  const preFlightChecks = await runPreFlightChecks(items, totalSize)
  const estimatedDuration = estimateRestoreDuration(totalSize, items.length)

  return {
    backupId: manifest.backupId,
    timestamp: manifest.timestamp,
    backupPath: manifest.backupPath ?? '',
    items,
    totalSize,
    estimatedDuration,
    executionOrder,
    preFlightChecks,
  }
}

function detectContainerDependencies(containers: ContainerConfig[]): Map<string, string[]> {
  const deps = new Map<string, string[]>()
  const reverseProxies = ['traefik', 'nginx-proxy-manager', 'swag', 'caddy']
  const databases = ['mariadb', 'mysql', 'postgres', 'mongodb', 'redis']

  for (const container of containers) {
    const containerDeps: string[] = []

    const proxyContainer = containers.find(c =>
      reverseProxies.some(proxy => c.name.toLowerCase().includes(proxy))
    )
    if (proxyContainer && proxyContainer.name !== container.name) {
      if (!reverseProxies.some(proxy => container.name.toLowerCase().includes(proxy))) {
        containerDeps.push(proxyContainer.name)
      }
    }

    if (container.env) {
      for (const envVal of Object.values(container.env)) {
        if (typeof envVal === 'string') {
          for (const dbName of databases) {
            if (envVal.toLowerCase().includes(dbName)) {
              const dbContainer = containers.find(c => c.name.toLowerCase().includes(dbName))
              if (dbContainer && dbContainer.name !== container.name) {
                if (!containerDeps.includes(dbContainer.name)) {
                  containerDeps.push(dbContainer.name)
                }
              }
            }
          }
        }
      }
    }

    deps.set(container.name, containerDeps)
  }

  return deps
}

function getPriority(containerName: string, deps: Map<string, string[]>): number {
  const name = containerName.toLowerCase()
  if (name.includes('traefik') || name.includes('nginx') || name.includes('caddy')) return 4
  if (name.includes('mariadb') || name.includes('mysql') || name.includes('postgres') ||
      name.includes('mongodb') || name.includes('redis')) return 4
  const containerDeps = deps.get(containerName) ?? []
  return containerDeps.length > 0 ? 5 : 6
}

function getContainerWarnings(container: ContainerConfig): string[] {
  const warnings: string[] = []
  if (container.ports) warnings.push('Check for port conflicts before starting')
  if (container.networks && container.networks.length > 1) warnings.push('Verify network configuration')
  return warnings
}

function generateExecutionOrder(items: RestoreItem[]): RestoreItem[][] {
  const priorityGroups = new Map<number, RestoreItem[]>()

  for (const item of items) {
    const group = priorityGroups.get(item.priority) ?? []
    group.push(item)
    priorityGroups.set(item.priority, group)
  }

  const sortedPriorities = Array.from(priorityGroups.keys()).sort((a, b) => a - b)
  return sortedPriorities.map(p => priorityGroups.get(p)!)
}

async function runPreFlightChecks(
  items: RestoreItem[],
  totalSize: number
): Promise<RestorePlan['preFlightChecks']> {
  const checks: RestorePlan['preFlightChecks'] = {
    diskSpace: { required: totalSize, available: 0, sufficient: false },
    conflicts: [],
    warnings: [],
  }

  try {
    const { stdout: dfOut } = await execFileAsync('df', ['-B1', '/mnt/user'])
    const stdout = dfOut.trim().split('\n').pop() ?? ''
    const available = parseInt(stdout.split(/\s+/)[3] ?? '0', 10)
    checks.diskSpace.available = isNaN(available) ? 0 : available
    checks.diskSpace.sufficient = checks.diskSpace.available > totalSize * 1.2
    if (!checks.diskSpace.sufficient) {
      checks.warnings.push('Insufficient disk space for restore')
    }
  } catch {
    checks.warnings.push('Could not check disk space (array may not be mounted)')
  }

  try {
    const { stdout } = await execFileAsync('docker', ['ps', '-a', '--format', '{{.Names}}'])
    const existingContainers = stdout.split('\n').filter(Boolean)
    for (const item of items) {
      if (item.type === 'appdata') {
        const containerName = item.name.replace('Container: ', '')
        if (existingContainers.includes(containerName)) {
          checks.conflicts.push({
            type: 'container',
            name: containerName,
            message: 'Container already exists — will be overwritten',
          })
        }
      }
    }
  } catch {
    // Docker not available — OK
  }

  return checks
}

function estimateRestoreDuration(totalSize: number, itemCount: number): number {
  const sizeSeconds = totalSize / (100 * 1024 * 1024) // 100 MB/s
  const overheadSeconds = itemCount * 5
  return Math.ceil(sizeSeconds + overheadSeconds)
}
