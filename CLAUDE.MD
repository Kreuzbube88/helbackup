# CLAUDE.md — HELBACKUP

Intelligent backup orchestrator for Unraid. Self-hosted, single Docker container.

## Claude Bridge

At the start of each session, check `C:\Users\hendr\claude-bridge\` for `.pending` files addressed to `helbackup`. Process them before other tasks. Reply by creating a new `.pending` file (`helbackup_heldash_{id}.pending`), then rename the original to `.done`. Full spec in `C:\Users\hendr\claude-bridge\BRIDGE.md`.

## Stack

| Layer | Tech |
|---|---|
| Runtime | **Node.js 24** (LTS), TypeScript strict |
| Frontend | React 18, Vite 5, react-router-dom v6 |
| State | Zustand: useStore · useJobStore · useTargetStore · useHistoryStore |
| Icons | lucide-react (16px headers, 14px buttons, 12px status) |
| Styling | Tailwind CSS + CSS custom properties |
| Backend | Fastify 4 |
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

Schema: Jobs (id, name, enabled, schedule, steps JSON), Targets (id, name, type, config JSON, enabled), JobHistory, Logs, Settings
- **Booleans**: SQLite `0 | 1` — write `? 1 : 0`, read `=== 1`
- **JSON fields**: `JSON.stringify()` on write, `JSON.parse()` with fallback on read

## Job Structure
```typescript
interface Job {
  id: string
  name: string
  enabled: boolean
  schedule: string  // Cron
  steps: JobStep[]
}

interface JobStep {
  id: string
  type: 'wake_nas' | 'shutdown_nas' | 'rsync' | 'ssh_command' | 'docker_stop' | 'docker_start'
  depends_on?: string[]  // Step IDs
  config: Record<string, unknown>
  retry: { max_attempts: number; backoff: 'linear' | 'exponential' }
}
```

**Execution:** Build dependency graph (topological sort) → execute in order → retry on failure → log everything → update history

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
- **SSH key permissions**: must be 600 — validate before use
- **Docker socket**: `undici.Pool` with `socketPath: '/var/run/docker.sock'`
- **Privileged container**: not required
- **Unraid array**: check `mdState` before backup — never if array stopped
- **Cron validation**: use `cron-parser` library
- **Rsync bandwidth**: use `--bwlimit=50M` to avoid saturation
- **JSON in SQLite**: always `JSON.stringify()` / `JSON.parse()` with try-catch
- **pino-pretty**: must be in `dependencies` (not devDependencies)
- **SSH keys**: store in `/app/config/ssh/` — never log private keys
- **Credentials**: sanitize all API responses — strip passwords, tokens, keys

## Dev Environment

- **Claude Code on Windows/PowerShell** — NO local Docker builds
- Container builds: GitHub Actions only
- Git: commit after changes, imperative lowercase <72 chars, scope prefix (`feat:` `fix:`)
- Forbidden: unsolicited tests, unsolicited refactoring, god components

## Deploy

Build:   GitHub Actions → ghcr.io/kreuzbube88/helbackup:<tag>
Unraid:  docker compose pull && docker compose up -d
Data:    /mnt/user/appdata/helbackup:/app/{config,data,logs}