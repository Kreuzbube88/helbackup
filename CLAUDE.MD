# CLAUDE.md — HELBACKUP

Intelligent backup orchestrator for Unraid. Self-hosted, single Docker container.

## Stack

| Layer | Tech |
|---|---|
| Runtime | **Node.js 24** (LTS), TypeScript strict |
| Frontend | React 18, Vite 5, react-router-dom v6 |
| State | Zustand: useStore · useJobStore · useTargetStore · useHistoryStore |
| Icons | lucide-react (16px headers, 14px buttons, 12px status) |
| Styling | Tailwind CSS + CSS custom properties |
| Backend | Fastify 5 |
| Auth | @fastify/jwt + bcryptjs (cost 12) |
| DB | better-sqlite3 (SQLite, WAL, no ORM) |
| Queue | node-schedule (cron-based) |
| Tools | ssh2, node-wake-on-lan, rsync (child_process) |
| Registry | ghcr.io/kreuzbube88/helbackup |

## Architecture

- Single container: Fastify serves `/api/*` + React SPA
- Privileged mode: not required
- Job orchestration: dependency graph → sequential execution → retry logic
- NAS management: WOL → health check → backup → graceful shutdown
- Backup types: Flash Drive, Appdata, VMs, Docker Images, System Config
- Multi-target: Remote server/NAS (SSH+Rsync), Local filesystem
- NAS target config JSON keys: `host`, `port`, `username`, `password?`, `privateKey?` (abs path), `path`, `knownHostsFile?` (abs path, enables strict host-key checking)

## Unraid Integration

**Mounted volumes (read-only):**
/boot → /unraid/boot              # Flash Drive (CRITICAL!)
/mnt/user → /unraid/user          # User array
/var/run/docker.sock              # Docker API
/etc/libvirt → /unraid/libvirt    # VM configs

**Pre-flight checks:** Array online (mdState=STARTED), Parity check not running, Mover not running, Target disk space sufficient

## Code Rules

**Frontend:**
- API calls ONLY via `api.ts` — never `fetch` in components
- State mutations via Zustand — never `api.*` directly in components
- Job Builder: visual dependency graph with @dnd-kit/core
- Live logs: SSE stream via `EventSource`
- Errors → local state → inline display

**Backend:**
- Interface for every request body and DB row (`CreateJobBody`, `JobRow`)
- Return `RowType | undefined` from `.get()` — never `unknown`
- Errors: `reply.status(N).send({ error: '...' })` — codes: 400/404/500/503
- Job execution: validate deps → execute sequential → log everything → retry on failure
- SSH: reuse connections within job — close after — timeout 30s
- Credentials: sanitize responses — strip `ssh_key`, `api_key`, `password`

## Database

Schema: Jobs, Targets, JobHistory, Logs, LogSummary, Settings, Admin, Manifest, EncryptionConfig, ApiTokens, Webhooks, WebhookDeliveries, NotificationConfig
- **Booleans**: SQLite `0 | 1` — write `? 1 : 0`, read `=== 1`
- **JSON fields**: `JSON.stringify()` on write, `JSON.parse()` with fallback on read
- **Migrations**: inline in `database.ts` migration array — idempotent, ignore "already exists" / "duplicate column"

**Key settings rows** (table `settings`, key/value):
| Key | Default | Purpose |
|-----|---------|---------|
| `recovery_mode` | `0` | Pauses all scheduled jobs |
| `log_retention_days` | `90` | Days before nightly cleanup deletes old logs |
| `self_backup_job_created` | — | Set on first boot after auto-creating self-backup job |

## Job Structure
```typescript
interface JobRow {
  id: string
  name: string
  enabled: number              // 0|1
  schedule: string | null
  steps: string                // JSON — see JobStep below
  catch_up_on_start: number    // 0|1 — run missed tick on container restart
  verify_checksums: number     // 0|1
  use_encryption: number       // 0|1
  retention_days: number | null
  retention_minimum: number
  pre_backup_script: string | null
  post_backup_script: string | null
}

interface JobStep {
  id: string
  type: 'flash' | 'appdata' | 'vms' | 'docker_images' | 'system_config' | 'cloud' | 'custom' | 'helbackup_self'
  depends_on?: string[]
  config: Record<string, unknown>
  retry?: { max_attempts: number; backoff: 'linear' | 'exponential' }
  stop_on_error?: boolean      // default true — set false to continue past step failures
}
```

**Execution:** Pre-flight (array state / parity / disk space) → NAS WOL → execute steps sequentially → retry on failure → log everything → write manifest → retention cleanup → notifications

## Backup Types

**Flash Drive (`/boot`):** Rsync to target, exclude `previous/` and `System Volume Information/`, verify SHA256, export config JSON

**Appdata (`/mnt/user/appdata`):** Optional container stop → Rsync (exclude `*/logs/*`, `*/cache/*`, `*/*.log`) → export Docker configs → restart

**VMs (`/mnt/user/domains`):** Libvirt snapshot if running → Rsync vDisks → export XML → delete snapshot

**Docker Images:** List via API → `docker save` to .tar → store in target

**System Config:** Export JSON: network, users, shares, plugins, disk assignments

## i18n

react-i18next, DE (default) + EN — always `useTranslation()`, never hardcode strings  
Namespaces: common + jobs + targets + recovery + settings  
Keep untranslated: Rsync, SSH, Docker, Unraid, technical terms

## Critical Gotchas

- **Node.js 24**: Use in Dockerfile `FROM node:24-alpine` and package.json `"engines": { "node": ">=24.0.0" }`
- **better-sqlite3 booleans**: write `? 1 : 0`, read `=== 1`
- **SSH key permissions**: validated at load time — `ssh.ts` rejects keys with `mode & 0o077` (not 0600). Paths stored in `/app/config/ssh/`.
- **SSH host-key pinning**: place `known_hosts_<host>` in `/app/config/ssh/` — `parseNasConfig` auto-discovers it and rsync uses `StrictHostKeyChecking=yes`. Without the file: `StrictHostKeyChecking=no` (default unchanged).
- **Docker socket**: `undici.Pool` with `socketPath: '/var/run/docker.sock'`
- **Privileged container**: not required
- **Unraid array**: `preflight.ts` checks `mdState=STARTED`, parity, mover before every job
- **Cron validation**: use `cron-parser` library; `catch_up_on_start` uses `parseExpression().prev().toDate()`
- **Rsync bandwidth**: use `--bwlimit=50M` to avoid saturation
- **Rsync exit codes 23/24**: treated as success for appdata; **fatal** (strict mode) for Flash + System Config
- **Atomic backup publish**: all steps write to `<dest>.partial/`, finalize via rename — recovery scanner only imports dirs that have `manifest.json`
- **JSON in SQLite**: always `JSON.stringify()` / `JSON.parse()` with try-catch
- **pino-pretty**: must be in `dependencies` (not devDependencies)
- **SSH keys**: store in `/app/config/ssh/` — never log private keys
- **SSH keys in self-backup**: always GPG-encrypted (with job encryption password if set, else master key derived from JWT_SECRET)
- **JWT_SECRET**: min 32 chars + Shannon entropy ≥ 3.5 bits/char enforced at startup — generate with `openssl rand -hex 32`; rotating it destroys all encrypted target credentials
- **Credentials**: sanitize all API responses — strip passwords, tokens, keys
- **Log retention**: nightly at 04:00 via scheduler, default 90 days, controlled by `settings.log_retention_days`
- **Log format**: production uses JSON (no `LOG_FORMAT=pretty` in Dockerfile); add it to `docker-compose.yml` for dev

## Dev Environment

- **Claude Code on Windows/PowerShell** — NO local Docker builds
- Container builds: GitHub Actions only
- Git: commit after changes, imperative lowercase <72 chars, scope prefix (`feat:` `fix:`)
- Forbidden: unsolicited tests, unsolicited refactoring, god components

## Deploy

Build:   GitHub Actions → ghcr.io/kreuzbube88/helbackup:<tag>
Unraid:  docker compose pull && docker compose up -d
Data:    /mnt/user/appdata/helbackup:/app/{config,data,logs}