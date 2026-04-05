# HELBACKUP — HELDASH Integration Guide

> **Token-only reference.** All endpoints listed here work with an API token (`helbackup_…`).
> No session JWT is required or recommended for HELDASH.

API base URL: `http://<helbackup-host>:3000`

---

## Authentication

HELDASH authenticates with a **static API token** created once in the HELBACKUP UI.

### Create a token (one-time, in the UI)

1. Open HELBACKUP → **Settings → API Tokens**
2. Click **New Token**
3. Name: `heldash`, Scopes: `read` (add `write` if HELDASH should trigger jobs)
4. Copy the token — it is shown **only once**

### Use in every request

```http
Authorization: Bearer helbackup_<token>
```

### Scopes

| Scope   | What it unlocks                         |
|---------|-----------------------------------------|
| `read`  | All GET endpoints — status, jobs, backups, history, targets |
| `write` | Trigger jobs (`POST /api/v1/jobs/:id/trigger`) |
| `admin` | Full access (not needed for HELDASH)    |

---

## Endpoints

All endpoints are under `/api/v1/` and accept the API token.
Base URL example: `http://192.168.1.100:3000`

---

### Health Check — no auth required

```
GET /health
```

Returns 200 when healthy, 503 when degraded.

```json
{
  "status": "healthy",
  "uptime": 3600,
  "database": "ok",
  "version": "1.0.0"
}
```

Use as a connectivity ping before other requests.

---

### Widget Status — compact summary `scope: read`

```
GET /api/v1/widget/status
```

**Recommended primary endpoint for a HELDASH status widget.** One request, all key data.

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "jobs": 4,
    "last24h": {
      "total": 8,
      "success": 7,
      "failed": 1
    },
    "lastBackup": {
      "timestamp": "2026-04-05T03:00:00.000Z",
      "status": "success",
      "duration": 142
    }
  }
}
```

`status`: `"ok"` | `"warning"` (warning = any failure in last 24 h)  
`lastBackup` is `null` if no backup has ever run.

---

### System Status — extended `scope: read`

```
GET /api/v1/status
```

```json
{
  "success": true,
  "data": {
    "system": "HELBACKUP",
    "version": "1.0.0",
    "status": "healthy",
    "jobs": { "total": 5, "enabled": 4 },
    "last24h": { "success": 7, "failed": 0 },
    "timestamp": "2026-04-05T10:00:00.000Z"
  }
}
```

`status`: `"healthy"` | `"degraded"`

---

### Jobs List `scope: read`

```
GET /api/v1/jobs
```

```json
{
  "success": true,
  "data": [
    {
      "id": "job-uuid",
      "name": "Flash + Appdata",
      "enabled": true,
      "schedule": "0 3 * * *"
    }
  ]
}
```

`enabled` is a boolean. `schedule` is a cron string or `null` (manual-only job).

---

### Targets List `scope: read`

```
GET /api/v1/targets
```

```json
{
  "success": true,
  "data": [
    {
      "id": "target-uuid",
      "name": "Synology NAS",
      "type": "nas",
      "enabled": true,
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

`type`: `"nas"` | `"rclone"` | `"local"`

---

### Recent Backups `scope: read`

```
GET /api/v1/backups?limit=10&offset=0
```

`limit` default 50, max 200.

```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "id": 1,
        "backup_id": "backup-uuid",
        "job_id": "job-uuid",
        "job_name": "Flash + Appdata",
        "timestamp": "2026-04-05T03:00:00.000Z",
        "total_size": 5368709120,
        "compressed_size": null,
        "verified": false,
        "target_name": null,
        "target_type": null
      }
    ],
    "pagination": { "total": 62, "limit": 10, "offset": 0 }
  }
}
```

> `compressed_size`, `target_name`, `target_type` are always `null` — not stored in the current schema.  
> `total_size` is in bytes, computed from the backup manifest. `null` if manifest is unreadable.

---

### Backup History `scope: read`

```
GET /api/v1/history?limit=50&offset=0&jobId=<uuid>&status=success
```

Query params: `limit` (default 50, max 200), `offset`, `jobId` (filter by job UUID), `status` (filter by status).

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "run-uuid",
        "job_id": "job-uuid",
        "job_name": "Flash + Appdata",
        "status": "success",
        "started_at": "2026-04-05T03:00:00.000Z",
        "ended_at": "2026-04-05T03:02:22.000Z",
        "duration_s": 142
      }
    ],
    "pagination": { "total": 62, "limit": 50, "offset": 0 }
  }
}
```

`status`: `"running"` | `"success"` | `"failed"` | `"cancelled"`  
`ended_at` and `duration_s` are `null` while a run is still active.

---

### Trigger a Job `scope: write`

```
POST /api/v1/jobs/:id/trigger
```

No request body needed.

Response 202:

```json
{
  "success": true,
  "data": {
    "triggered": true,
    "jobId": "job-uuid",
    "runId": "run-uuid",
    "message": "Backup started"
  }
}
```

After triggering, poll `GET /api/v1/history?jobId=<jobId>&limit=1` to track completion.

---

## Error Format

All `/api/v1/*` endpoints return structured errors:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Job not found"
  }
}
```

Error codes: `UNAUTHORIZED` · `INVALID_TOKEN` · `TOKEN_EXPIRED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_ERROR` · `INTERNAL_ERROR`

HTTP 401 = missing/invalid token. HTTP 403 = valid token, insufficient scope.

---

## TypeScript Interfaces

```typescript
// Base URL helper
const HELBACKUP = (host: string) => `http://${host}:3000`
const AUTH = (token: string) => ({ Authorization: `Bearer ${token}` })

// --- Types ---

interface WidgetStatus {
  status: 'ok' | 'warning'
  jobs: number
  last24h: { total: number; success: number; failed: number }
  lastBackup: { timestamp: string; status: string; duration: number } | null
}

interface SystemStatus {
  system: string
  version: string
  status: 'healthy' | 'degraded'
  jobs: { total: number; enabled: number }
  last24h: { success: number; failed: number }
  timestamp: string
}

interface Job {
  id: string
  name: string
  enabled: boolean
  schedule: string | null
}

interface Target {
  id: string
  name: string
  type: 'nas' | 'rclone' | 'local'
  enabled: boolean
  created_at: string
}

interface BackupEntry {
  id: number
  backup_id: string
  job_id: string
  job_name: string | null
  timestamp: string
  total_size: number | null
  compressed_size: null
  verified: boolean | null
  target_name: null
  target_type: null
}

interface HistoryEntry {
  id: string
  job_id: string
  job_name: string | null
  status: 'running' | 'success' | 'failed' | 'cancelled'
  started_at: string
  ended_at: string | null
  duration_s: number | null
}

interface Pagination {
  total: number
  limit: number
  offset: number
}

// --- API functions ---

async function helbackupFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...AUTH(token), ...init?.headers } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `HTTP ${res.status}`)
  }
  const body = await res.json() as { success: boolean; data: T }
  return body.data
}

async function getWidgetStatus(host: string, token: string): Promise<WidgetStatus> {
  return helbackupFetch<WidgetStatus>(`${HELBACKUP(host)}/api/v1/widget/status`, token)
}

async function getSystemStatus(host: string, token: string): Promise<SystemStatus> {
  return helbackupFetch<SystemStatus>(`${HELBACKUP(host)}/api/v1/status`, token)
}

async function getJobs(host: string, token: string): Promise<Job[]> {
  return helbackupFetch<Job[]>(`${HELBACKUP(host)}/api/v1/jobs`, token)
}

async function getRecentBackups(host: string, token: string, limit = 10): Promise<{ backups: BackupEntry[]; pagination: Pagination }> {
  return helbackupFetch(`${HELBACKUP(host)}/api/v1/backups?limit=${limit}`, token)
}

async function getHistory(host: string, token: string, params?: { jobId?: string; status?: string; limit?: number }): Promise<{ history: HistoryEntry[]; pagination: Pagination }> {
  const q = new URLSearchParams()
  if (params?.jobId) q.set('jobId', params.jobId)
  if (params?.status) q.set('status', params.status)
  if (params?.limit) q.set('limit', String(params.limit))
  return helbackupFetch(`${HELBACKUP(host)}/api/v1/history?${q}`, token)
}

async function triggerJob(host: string, token: string, jobId: string): Promise<{ runId: string }> {
  return helbackupFetch(`${HELBACKUP(host)}/api/v1/jobs/${jobId}/trigger`, token, { method: 'POST' })
}

// Poll for job completion after triggering
async function waitForJob(host: string, token: string, jobId: string, pollMs = 5000): Promise<HistoryEntry> {
  for (;;) {
    const { history } = await getHistory(host, token, { jobId, limit: 1 })
    const run = history[0]
    if (run && run.status !== 'running') return run
    await new Promise(r => setTimeout(r, pollMs))
  }
}
```

---

## Polling Strategy

| Use case | Endpoint | Recommended interval |
|----------|----------|----------------------|
| Status badge | `GET /api/v1/widget/status` | 60 s |
| Job list | `GET /api/v1/jobs` | On demand |
| Backup history | `GET /api/v1/history` | 5 min or on demand |
| Recent backups | `GET /api/v1/backups` | 5 min or on demand |
| Track triggered job | `GET /api/v1/history?jobId=…&limit=1` | Poll every 5 s until status ≠ `running` |

---

## Retry Strategy

```typescript
async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, init)
    if (res.status !== 503 && res.status !== 429) return res
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
  }
  throw new Error(`Failed after ${maxRetries} retries`)
}
```

---

## What is NOT available via API token

These endpoints require a session JWT (used by the HELBACKUP web UI only) and cannot be accessed with an API token:

| Endpoint | Reason |
|----------|--------|
| `GET /api/dashboard` | Internal UI endpoint, JWT only |
| `GET /api/executions/:runId` | JWT only — use `GET /api/v1/history?jobId=…` to track jobs |
| `GET /metrics` | Prometheus endpoint, JWT only |
| `POST /api/logs/:runId/stream-token` | SSE token issuance, JWT only |
| `POST /api/webhooks` | Webhook management, JWT only — set up in the UI |
