# HELBACKUP — HELDASH Integration Guide

API base URL: `http://helbackup:8080`

---

## Authentication

HELBACKUP has two auth mechanisms:

### 1. API Token (recommended for HELDASH)

Tokens use the `helbackup_` prefix and are scoped to `read`, `write`, or `admin`.

**Create a token** (requires active session — do this once in the UI or via API):

```bash
# Step 1: get a session JWT
curl -X POST http://helbackup:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<password>"}'
# → { "token": "<jwt>", "user": { "id": 1, "username": "admin" } }

# Step 2: create an API token
curl -X POST http://helbackup:8080/api/tokens \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name":"heldash","scopes":["read"],"expiresInDays":365}'
# → { "token": "helbackup_...", ... }  ← save immediately, shown only once
```

**Use in requests:**

```http
Authorization: Bearer helbackup_<token>
```

**Scopes:**

| Scope   | Can do                                      |
|---------|---------------------------------------------|
| `read`  | GET all status/jobs/backup data             |
| `write` | Trigger/cancel jobs                         |
| `admin` | Full access                                 |

### 2. Session JWT

Short-lived token from `POST /api/auth/login`. Used by the web UI. Not recommended for HELDASH — use API tokens instead.

---

## Endpoints for Dashboard Widgets

### Health Check (no auth)

```
GET /health
```

Response (200 healthy / 503 degraded):

```json
{
  "status": "healthy",
  "uptime": 3600,
  "database": "ok",
  "version": "1.0.0"
}
```

Use this for a simple "is it reachable" ping.

---

### Widget Status — compact summary (scope: `read`)

```
GET /api/v1/widget/status
```

**The primary endpoint for a HELDASH status widget.** Single request, all key data.

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

`status` is `"ok"` or `"warning"` (any failures in last 24h).

---

### System Status — extended (scope: `read`)

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

`status` is `"healthy"` (no failures) or `"degraded"`.

---

### Full Dashboard Data (session JWT only)

```
GET /api/dashboard
```

Returns a comprehensive payload for the full dashboard view. Requires session JWT, not API token.

```json
{
  "systemStatus": {
    "status": "healthy",
    "message": "All systems operational",
    "lastBackup": {
      "timestamp": "2026-04-05T03:00:00.000Z",
      "jobName": "Flash + Appdata",
      "status": "success",
      "duration": 142
    },
    "nextScheduled": {
      "timestamp": "2026-04-06T03:00:00.000Z",
      "jobName": "Flash + Appdata"
    }
  },
  "backupHistory": [
    { "date": "2026-04-04", "success": 2, "failed": 0, "total": 2 }
  ],
  "successRate": {
    "percentage": 97,
    "total": 60,
    "successful": 58,
    "failed": 2
  },
  "storage": {
    "totalUsed": 10737418240,
    "totalAvailable": 107374182400,
    "percentage": 9,
    "oldestBackup": "2026-02-01T00:00:00.000Z",
    "backupCount": 62,
    "growthTrend": { "daily": 357913941, "weekly": 2505397589 }
  },
  "recentJobs": [
    {
      "id": "run-uuid",
      "jobName": "Flash + Appdata",
      "status": "success",
      "startTime": "2026-04-05T03:00:00.000Z",
      "endTime": "2026-04-05T03:02:22.000Z",
      "duration": 142,
      "size": 0
    }
  ],
  "warnings": [
    { "type": "warning", "message": "No backup in over 48 hours", "action": "Check schedule" }
  ]
}
```

`systemStatus.status`: `"healthy"` | `"warning"` | `"critical"`  
`warnings[].type`: `"error"` | `"warning"` | `"info"`  
`storage` values are bytes (local targets only; cloud targets not included).

---

### Jobs List (scope: `read`)

```
GET /api/v1/jobs
```

```json
{
  "success": true,
  "data": [
    { "id": "job-uuid", "name": "Flash + Appdata", "enabled": true, "schedule": "0 3 * * *" }
  ]
}
```

---

### Recent Backups (scope: `read`)

```
GET /api/v1/backups?limit=10&offset=0
```

Max `limit`: 200 (default: 50).

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

---

### Backup History (scope: `read`)

```
GET /api/v1/history?limit=50&offset=0&jobId=<uuid>&status=success
```

Query parameters: `limit` (default 50, max 200), `offset`, `jobId` (filter by job), `status` (`running` | `success` | `failed` | `cancelled`).

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

---

### Trigger a Job (scope: `write`)

```
POST /api/v1/jobs/:id/trigger
```

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

---

### Execution Status (session JWT only)

```
GET /api/executions/:runId
```

```json
{
  "id": "run-uuid",
  "job_id": "job-uuid",
  "status": "running",
  "started_at": "2026-04-05T03:00:00.000Z",
  "ended_at": null,
  "duration_s": null
}
```

`status`: `"running"` | `"success"` | `"failed"`

---

### Prometheus Metrics (session JWT only)

```
GET /metrics
```

Returns Prometheus text format. Metrics available:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `helbackup_backups_total` | Gauge | `status`, `job_name` | Backup runs in last 24h |
| `helbackup_storage_bytes` | Gauge | `target_name`, `type` | Backup count per job |
| `helbackup_backup_duration_seconds` | Histogram | `job_name` | Duration buckets: 30s, 60s, 5m, 10m, 30m, 1h |
| `helbackup_active_jobs` | Gauge | — | Currently running jobs |
| `helbackup_recovery_mode_enabled` | Gauge | — | 1 if recovery mode active |

---

## SSE Live Logs

For monitoring active job runs in real time:

```javascript
// Step 1: issue a short-lived SSE token (60s, one-time use)
const { sseToken } = await fetch(`/api/logs/${runId}/stream-token`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${jwtToken}` }
}).then(r => r.json())

// Step 2: open EventSource with the token
const es = new EventSource(`/api/logs/${runId}/stream?sseToken=${sseToken}`)

es.addEventListener('log', e => {
  const log = JSON.parse(e.data)
  // { id, run_id, step_id, level, category, message, metadata, ts }
})
es.addEventListener('complete', () => es.close())
es.addEventListener('error', e => { console.error(e); es.close() })
```

Replays all stored logs on connect, then streams live. Closes with `complete` or `error` event.

---

## Webhooks

Register a URL to receive push events (no polling needed):

```bash
curl -X POST http://helbackup:8080/api/webhooks \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "heldash",
    "url": "http://heldash:3000/webhooks/helbackup",
    "secret": "optional-hmac-secret",
    "events": ["backup_success", "backup_failed"]
  }'
```

**Available events:** `backup_started`, `backup_success`, `backup_failed`, `restore_started`, `restore_completed`, `restore_failed`, `*` (all)

**Payload:**

```json
{
  "event": "backup_success",
  "timestamp": "2026-04-05T03:02:22.000Z",
  "data": { ... }
}
```

If `secret` is set, HELBACKUP sends an `X-Webhook-Signature` HMAC-SHA256 header.

---

## Data Fetching Strategy

| Use case | Strategy | Recommended interval |
|----------|----------|----------------------|
| Status badge | Poll `/api/v1/widget/status` | 60s |
| Dashboard page load | Poll `/api/dashboard` | On demand + 5min refresh |
| Job history list | Poll `/api/v1/backups` | 5min or on demand |
| Active job monitoring | SSE `/api/logs/:runId/stream` | Real-time (push) |
| Alerting (failures) | Webhook `backup_failed` | Push — no polling |

---

## Widget Code Examples

### Status Badge

```typescript
interface WidgetStatus {
  status: 'ok' | 'warning'
  jobs: number
  last24h: { total: number; success: number; failed: number }
  lastBackup: { timestamp: string; status: string; duration: number } | null
}

async function getHelbackupStatus(host: string, token: string): Promise<WidgetStatus> {
  const res = await fetch(`http://${host}/api/v1/widget/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HELBACKUP: ${res.status}`)
  const body = await res.json() as { success: boolean; data: WidgetStatus }
  return body.data
}
```

### Recent Backups List

```typescript
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

async function getRecentBackups(host: string, token: string, limit = 10): Promise<BackupEntry[]> {
  const res = await fetch(`http://${host}/api/v1/backups?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HELBACKUP: ${res.status}`)
  const body = await res.json() as { success: boolean; data: { backups: BackupEntry[] } }
  return body.data.backups
}
```

### Trigger Job + Monitor via SSE

```typescript
async function triggerAndMonitor(
  host: string,
  apiToken: string,
  jwtToken: string,
  jobId: string,
  onLog: (msg: string) => void,
  onDone: (success: boolean) => void
) {
  // Trigger
  const trigRes = await fetch(`http://${host}/api/v1/jobs/${jobId}/trigger`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}` },
  })
  if (!trigRes.ok) throw new Error(`Trigger failed: ${trigRes.status}`)
  const { data } = await trigRes.json() as { data: { runId: string } }

  // Get SSE token
  const tokenRes = await fetch(`http://${host}/api/logs/${data.runId}/stream-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwtToken}` },
  })
  const { sseToken } = await tokenRes.json() as { sseToken: string }

  // Stream logs
  const es = new EventSource(`http://${host}/api/logs/${data.runId}/stream?sseToken=${sseToken}`)
  es.addEventListener('log', e => {
    const log = JSON.parse(e.data) as { message: string; level: string }
    onLog(`[${log.level}] ${log.message}`)
  })
  es.addEventListener('complete', () => { es.close(); onDone(true) })
  es.addEventListener('error', () => { es.close(); onDone(false) })
}
```

### Success Rate Gauge

```typescript
interface SuccessRate {
  percentage: number
  total: number
  successful: number
  failed: number
}

// Requires session JWT (use /api/dashboard endpoint)
async function getSuccessRate(host: string, jwtToken: string): Promise<SuccessRate> {
  const res = await fetch(`http://${host}/api/dashboard`, {
    headers: { Authorization: `Bearer ${jwtToken}` },
  })
  if (!res.ok) throw new Error(`Dashboard: ${res.status}`)
  const body = await res.json() as { successRate: SuccessRate }
  return body.successRate
}
```

---

## Error Response Format

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

Error codes: `UNAUTHORIZED`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`

Legacy endpoints (`/api/dashboard`, `/api/logs`, etc.) return:

```json
{ "error": "message string" }
```

### Retry Strategy

```typescript
async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, init)
    if (res.status !== 503 && res.status !== 429) return res
    // Exponential backoff: 1s, 2s, 4s
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
  }
  throw new Error(`Failed after ${maxRetries} retries`)
}
```

---

## Rate Limits & Best Practices

- No explicit rate limiting is configured — avoid polling more frequently than 30s
- `/api/v1/widget/status` is the lightest endpoint; use it for status badges
- `/api/dashboard` runs 6 parallel queries including `du`/`df` — call max once per page load
- `/metrics` runs DB queries on each scrape — set Prometheus scrape interval ≥ 30s
- Cache token scopes client-side; only re-validate on 401 responses
- SSE connections are persistent — open only when actively monitoring a run
- Webhooks are the best choice for failure alerts (zero polling overhead)
