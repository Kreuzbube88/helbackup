# API — Overview

HELBACKUP provides a complete REST API for external integrations.

## Authentication

Access via **API Tokens** (not session JWT!).

### Create Token

1. Settings → API Tokens → "Create New Token"
2. Configure:

```
Name: HELDASH Integration
Scopes: read, write
Expires In: 1 year
```

3. Token shown once:
```
helbackup_a8f5e2c9d1b4f7a3e6c8b2d5f9a1c4e7b3d6
```

> **Copy now — never shown again!**

### Use Token

```http
Authorization: Bearer helbackup_YOUR_TOKEN_HERE
```

## Base URL

```
http://YOUR-UNRAID-IP:3000/api/v1
```

## Scopes

| Scope | Permissions |
|-------|-------------|
| `read` | Read status, backups, jobs |
| `write` | Trigger backups, change settings |
| `admin` | Token management, everything |

## Rate Limiting

- 100 requests / minute / token
- Localhost (127.0.0.1): no limit

On exceeded:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "Rate limit exceeded. Try again in 42 seconds."
  }
}
```

## Response Format

### Success
```json
{
  "success": true,
  "data": { },
  "meta": { "timestamp": "2024-01-15T14:22:00Z" }
}
```

### Error
```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Job not found" },
  "meta": { "timestamp": "2024-01-15T14:22:00Z" }
}
```

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/status` | System status |
| GET | `/api/v1/jobs` | All jobs |
| POST | `/api/v1/jobs/:id/trigger` | Trigger job |
| GET | `/api/v1/history` | Backup history |
| GET | `/api/v1/targets` | All targets |
| GET | `/api/v1/widget/status` | Dashboard widget |
| GET | `/metrics` | Prometheus metrics |

Details: [All Endpoints](endpoints.md)

## Quick Start

```bash
curl -X GET "http://192.168.1.100:3000/api/v1/status" \
  -H "Authorization: Bearer helbackup_YOUR_TOKEN"
```

Examples: [curl](examples/curl.md) | [Python](examples/python.md) | [Node.js](examples/nodejs.md) | [PowerShell](examples/powershell.md)

## OpenAPI / Swagger

```
http://YOUR-UNRAID-IP:3000/api/docs
```

---
Next: [Endpoints](endpoints.md) | [Examples](examples/curl.md)
