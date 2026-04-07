import { FastifyInstance } from 'fastify';
import { db } from '../db/database.js';
import { safeJsonParseOrThrow } from '../utils/safeJson.js';
import { executeRsync } from '../tools/rsync.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

const ALLOWED_SCAN_BASES = ['/app/data/', '/app/config/', '/unraid/', '/mnt/']

function isSafePath(p: string): boolean {
  return path.isAbsolute(p) && !p.includes('..')
}

export default async function recoveryRoutes(app: FastifyInstance) {
  // Load persisted recovery mode from settings table
  const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'recovery_mode'").get() as { value: string } | undefined
  let recoveryMode = settingRow?.value === '1'

  // Get recovery mode status
  app.get('/api/recovery/status', { preHandler: [app.authenticate] }, async (_request, reply) => {
    return reply.send({ enabled: recoveryMode })
  })

  // Enable recovery mode
  app.post('/api/recovery/enable', {
    preHandler: [app.authenticate],
    schema: {
      body: {
        type: 'object',
        additionalProperties: true
      }
    }
  }, async (_request, reply) => {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('recovery_mode', '1')").run()
    recoveryMode = true
    return reply.send({ ok: true })
  })

  // Disable recovery mode
  app.post('/api/recovery/disable', {
    preHandler: [app.authenticate],
    schema: {
      body: {
        type: 'object',
        additionalProperties: true
      }
    }
  }, async (_request, reply) => {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('recovery_mode', '0')").run()
    recoveryMode = false
    return reply.send({ ok: true })
  })

  // List all backup manifests
  app.get('/api/recovery/manifests', { preHandler: [app.authenticate] }, async (_request, reply) => {
    try {
      const manifests = db.prepare(
        'SELECT * FROM manifest ORDER BY created_at DESC'
      ).all();

      return reply.send(manifests);
    } catch (error: unknown) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get specific manifest details
  app.get<{ Params: { backupId: string } }>(
    '/api/recovery/manifests/:backupId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const manifest = db.prepare(
          'SELECT * FROM manifest WHERE backup_id = ?'
        ).get(request.params.backupId) as Record<string, unknown> | undefined;

        if (!manifest) {
          return reply.status(404).send({ error: 'Manifest not found' });
        }

        return reply.send({
          ...manifest,
          manifest: safeJsonParseOrThrow(manifest.manifest as string, 'manifest detail')
        });
      } catch (error: unknown) {
        return reply.status(500).send({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  // Scan backup directory for manifests (if DB lost)
  app.post<{ Body: { path: string } }>(
    '/api/recovery/scan',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const scanPath = request.body.path;

        if (!isSafePath(scanPath) || !ALLOWED_SCAN_BASES.some(base => path.resolve(scanPath).startsWith(base))) {
          return reply.status(400).send({ error: 'Scan path must be within an allowed directory (/app/data, /unraid, /mnt)' });
        }

        const manifests: Record<string, unknown>[] = [];

        async function scanDir(dir: string) {
          try {
            const items = await fs.readdir(dir, { withFileTypes: true });

            for (const item of items) {
              const fullPath = path.join(dir, item.name);

              if (item.isDirectory()) {
                await scanDir(fullPath);
              } else if (item.name === 'manifest.json') {
                const content = await fs.readFile(fullPath, 'utf-8');
                const manifest = safeJsonParseOrThrow<Record<string, unknown>>(content, 'scanned manifest');
                manifests.push({
                  path: fullPath,
                  ...manifest
                });
              }
            }
          } catch {
            // Ignore permission errors
          }
        }

        await scanDir(scanPath);

        // Import found manifests into DB (skip duplicates)
        let imported = 0;
        for (const m of manifests) {
          try {
            const backupId = (m.backupId ?? m.backup_id ?? randomUUID()) as string;
            const jobId = (m.jobId ?? m.job_id ?? 'scanned') as string;
            const timestamp = (m.timestamp ?? m.created_at ?? new Date().toISOString()) as string;
            const exists = db.prepare('SELECT 1 FROM manifest WHERE backup_id = ?').get(backupId);
            if (!exists) {
              db.prepare(
                'INSERT INTO manifest (backup_id, job_id, manifest, created_at) VALUES (?, ?, ?, ?)'
              ).run(backupId, jobId, JSON.stringify(m), timestamp);
              imported++;
            }
          } catch (insertErr) {
            logger.warn(`[recovery/scan] Failed to import manifest: ${insertErr instanceof Error ? insertErr.message : String(insertErr)}`);
          }
        }
        logger.info(`[recovery/scan] Found ${manifests.length} manifests, imported ${imported} new`);

        return reply.send({ manifests, count: manifests.length, imported });
      } catch (error: unknown) {
        return reply.status(500).send({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  // Restore container configs from backup
  app.post<{ Body: { backupId: string; containers: string[] } }>(
    '/api/recovery/restore/containers',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { backupId, containers } = request.body;

        const manifestRecord = db.prepare(
          'SELECT * FROM manifest WHERE backup_id = ?'
        ).get(backupId) as Record<string, unknown> | undefined;

        if (!manifestRecord) {
          return reply.status(404).send({ error: 'Manifest not found' });
        }

        const manifest = safeJsonParseOrThrow<{
          containerConfigs?: Array<{ id: string; name: string; image: string; env?: string[]; volumes?: string[]; ports?: Record<string, Array<{ HostPort: string }>>; network?: string; labels?: Record<string, string> }>;
        }>(manifestRecord.manifest as string, 'container restore manifest');

        if (!manifest.containerConfigs) {
          return reply.status(404).send({ error: 'No container configs in backup' });
        }

        const restored: Array<{ id: string; name: string; command: string }> = [];
        const failed: Array<{ id: string; error: string }> = [];

        for (const containerId of containers) {
          const config = manifest.containerConfigs.find(c => c.id === containerId || c.name === containerId);

          if (!config) {
            failed.push({ id: containerId, error: 'Config not found' });
            continue;
          }

          try {
            const cmd = buildDockerRunCommand(config);
            restored.push({
              id: containerId,
              name: config.name,
              command: cmd
            });
          } catch (error: unknown) {
            failed.push({ id: containerId, error: error instanceof Error ? error.message : String(error) });
          }
        }

        return reply.send({ restored, failed });
      } catch (error: unknown) {
        return reply.status(500).send({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  // Restore database from dump
  app.post<{ Body: { backupId: string; containerId: string; databaseType: string } }>(
    '/api/recovery/restore/database',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { backupId, containerId, databaseType } = request.body;

        const manifestRecord = db.prepare(
          'SELECT * FROM manifest WHERE backup_id = ?'
        ).get(backupId) as Record<string, unknown> | undefined;

        if (!manifestRecord) {
          return reply.status(404).send({ error: 'Manifest not found' });
        }

        const manifest = safeJsonParseOrThrow<{
          entries?: Array<{ path: string }>;
        }>(manifestRecord.manifest as string, 'database restore manifest');

        const dumpEntry = manifest.entries?.find((e) =>
          e.path.includes('database-dumps') && e.path.includes(containerId)
        );

        if (!dumpEntry) {
          return reply.status(404).send({ error: 'No database dump found for this container' });
        }

        let restoreCommand = '';

        switch (databaseType) {
          case 'postgres':
            restoreCommand = `docker exec -i ${containerId} psql -U postgres < ${dumpEntry.path}`;
            break;
          case 'mysql':
          case 'mariadb':
            restoreCommand = `docker exec -i ${containerId} sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD"' < ${dumpEntry.path}`;
            break;
          case 'mongodb':
            restoreCommand = `docker exec ${containerId} mongorestore --dir ${dumpEntry.path}`;
            break;
          default:
            return reply.status(400).send({ error: 'Unsupported database type' });
        }

        return reply.send({
          dumpPath: dumpEntry.path,
          restoreCommand,
          instructions: [
            '1. Ensure the container is running',
            '2. Run the restore command below',
            '3. Verify database integrity',
            '4. Restart dependent containers if needed'
          ]
        });
      } catch (error: unknown) {
        return reply.status(500).send({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  // Restore files from backup using rsync --files-from
  app.post<{ Body: { backupId: string; files: string[]; destination: string } }>(
    '/api/recovery/restore/files',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { backupId, files, destination } = request.body;

        if (!files || files.length === 0) {
          return reply.status(400).send({ error: 'No files specified' });
        }

        if (!isSafePath(destination)) {
          return reply.status(400).send({ error: 'Destination path is not safe' });
        }

        const manifestRecord = db.prepare(
          'SELECT * FROM manifest WHERE backup_id = ?'
        ).get(backupId) as Record<string, unknown> | undefined;

        if (!manifestRecord) {
          return reply.status(404).send({ error: 'Manifest not found' });
        }

        interface StoredManifestBasic {
          backupPath?: string
        }

        const manifest = safeJsonParseOrThrow<StoredManifestBasic>(
          manifestRecord.manifest as string,
          'file restore manifest'
        );

        if (!manifest.backupPath) {
          return reply.status(400).send({ error: 'Manifest does not contain backupPath — cannot locate backup files' });
        }

        const backupPath = manifest.backupPath;

        await fs.mkdir(destination, { recursive: true });

        // Write file list to temp file for rsync --files-from
        const tmpFile = path.join(os.tmpdir(), `helbackup-restore-${randomUUID()}.txt`);
        try {
          await fs.writeFile(tmpFile, files.join('\n'), 'utf-8');

          logger.info(`[restore/files] rsync --files-from from ${backupPath} → ${destination} (${files.length} files)`);

          await executeRsync({
            source: backupPath + '/',
            destination,
            bwLimit: 51200,
            filesFrom: tmpFile,
            onLog: msg => { if (msg.trim()) logger.debug(`[rsync] ${msg.trim()}`) },
          });
        } finally {
          await fs.unlink(tmpFile).catch(() => undefined);
        }

        return reply.send({
          message: 'File restore completed',
          files: files.length,
          destination,
        });
      } catch (error: unknown) {
        logger.error(`[restore/files] error: ${error instanceof Error ? error.message : String(error)}`);
        return reply.status(500).send({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );
}

interface ContainerConfig {
  name: string;
  image: string;
  env?: string[];
  volumes?: string[];
  ports?: Record<string, Array<{ HostPort: string }>>;
  network?: string;
  labels?: Record<string, string>;
}

function shellEscape(value: string): string {
  // Wrap in single quotes, escaping any single quotes within the value
  return `'${value.replace(/'/g, "'\\''")}'`
}

function buildDockerRunCommand(config: ContainerConfig): string {
  let cmd = `docker run -d --name ${shellEscape(config.name)}`;

  if (config.env) {
    config.env.forEach((env) => {
      cmd += ` -e ${shellEscape(env)}`;
    });
  }

  if (config.volumes) {
    config.volumes.forEach((vol) => {
      cmd += ` -v ${shellEscape(vol)}`;
    });
  }

  if (config.ports) {
    Object.entries(config.ports).forEach(([container, hostBindings]) => {
      if (hostBindings && hostBindings[0]) {
        const hostPort = hostBindings[0].HostPort.replace(/[^0-9]/g, '')
        const containerPort = container.split('/')[0].replace(/[^0-9]/g, '')
        if (hostPort && containerPort) {
          cmd += ` -p ${hostPort}:${containerPort}`;
        }
      }
    });
  }

  if (config.network) {
    cmd += ` --network ${shellEscape(config.network)}`;
  }

  if (config.labels) {
    Object.entries(config.labels).forEach(([key, value]) => {
      cmd += ` --label ${shellEscape(`${key}=${value}`)}`;
    });
  }

  cmd += ` ${shellEscape(config.image)}`;

  return cmd;
}
