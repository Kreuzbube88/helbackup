# API Endpoints

## GET /api/v1/status

System-Status abfragen.

**Request:**
```http
GET /api/v1/status
Authorization: Bearer helbackup_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "system": "HELBACKUP",
    "version": "1.0.0",
    "status": "healthy",
    "uptime": 864000,
    "jobs": {
      "total": 8,
      "enabled": 5,
      "running": 0
    },
    "last24h": {
      "success": 11,
      "failed": 0,
      "warnings": 1
    }
  }
}
```

## GET /api/v1/jobs

Alle konfigurierten Jobs.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Daily Flash Backup",
      "enabled": true,
      "schedule": "0 2 * * *",
      "lastRun": "2024-01-15T02:00:00Z",
      "lastStatus": "success",
      "nextRun": "2024-01-16T02:00:00Z"
    }
  ]
}
```

## POST /api/v1/jobs/:id/trigger

Job manuell starten.

**Request:**
```http
POST /api/v1/jobs/1/trigger
Authorization: Bearer helbackup_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "1",
    "runId": "run_20240115_142200",
    "status": "started",
    "message": "Job started successfully"
  }
}
```

## GET /api/v1/history

Backup-History abrufen.

**Query Params:**
- `limit` (default: 50)
- `offset` (default: 0)
- `jobId` (optional)
- `status` (optional: success/failed/warning)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "run_20240115_020000",
      "jobId": "1",
      "jobName": "Daily Flash Backup",
      "status": "success",
      "startedAt": "2024-01-15T02:00:00Z",
      "completedAt": "2024-01-15T02:00:35Z",
      "duration": 35,
      "size": 12582912
    }
  ],
  "meta": {
    "total": 120,
    "limit": 50,
    "offset": 0
  }
}
```

## GET /api/v1/widget/status

Kompaktes Widget für Dashboards (HELDASH, Home Assistant).

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "lastBackup": "2024-01-15T02:00:00Z",
    "successRate24h": 100,
    "jobsCount": 8,
    "storageUsed": "45.2 GB"
  }
}
```

## GET /api/v1/backups

Gibt die Backup-Historie zurück. Kann optional nach Job gefiltert werden.

**Authentifizierung:** API-Token oder JWT erforderlich.

**Query Parameter:**
- `jobId` (optional): Filtert Ergebnisse auf einen bestimmten Job.

**Beispiel:**
```bash
# Alle Backups
curl -H "Authorization: Bearer helbackup_..." \
  http://unraid:3000/api/v1/backups

# Backups für einen bestimmten Job
curl -H "Authorization: Bearer helbackup_..." \
  "http://unraid:3000/api/v1/backups?jobId=abc-123"
```

**Antwort:**
```json
[
  {
    "id": "uuid",
    "jobId": "abc-123",
    "jobName": "NAS Vollbackup",
    "status": "success",
    "startedAt": "2024-01-15T02:00:00Z",
    "duration": 142
  }
]
```

## GET /api/audit-log

Gibt das Audit-Log zurück. Protokolliert alle erfolgreichen schreibenden API-Anfragen (POST/PUT/DELETE).

**Authentifizierung:** JWT erforderlich (kein API-Token).

**Beispiel:**
```bash
curl -H "Authorization: Bearer <jwt>" \
  http://unraid:3000/api/audit-log
```

**Antwort:**
```json
[
  {
    "id": 1,
    "action": "POST /api/jobs",
    "actor": "admin",
    "resource": "jobs",
    "resource_id": "abc-123",
    "details": { "status": 200 },
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

> Nur erfolgreiche Anfragen (HTTP < 400) werden protokolliert.

---
Zurück: [API Overview](overview.md)
