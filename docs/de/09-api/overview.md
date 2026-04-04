# API — Übersicht

HELBACKUP bietet eine vollständige REST API für externe Integrationen.

## Authentifizierung

Zugriff über **API Tokens** (nicht Session JWT!).

### Token erstellen

1. Settings → API Tokens → "Create New Token"
2. Konfiguration:

```
Name: HELDASH Integration
Scopes: read, write
Expires In: 1 year
```

3. Token wird einmalig angezeigt:
```
helbackup_a8f5e2c9d1b4f7a3e6c8b2d5f9a1c4e7b3d6
```

> **JETZT kopieren — wird nie wieder angezeigt!**

### Token verwenden

```http
Authorization: Bearer helbackup_YOUR_TOKEN_HERE
```

## Base URL

```
http://YOUR-UNRAID-IP:3000/api/v1
```

## Scopes

| Scope | Berechtigungen |
|-------|---------------|
| `read` | Status, Backups, Jobs lesen |
| `write` | Backups triggern, Settings ändern |
| `admin` | Token Management, alles |

## Rate Limiting

- 100 Requests / Minute / Token
- Localhost (127.0.0.1): kein Limit

Überschreitung:
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
  "meta": {
    "timestamp": "2024-01-15T14:22:00Z"
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Job not found"
  },
  "meta": {
    "timestamp": "2024-01-15T14:22:00Z"
  }
}
```

## Error Codes

| Code | HTTP | Bedeutung |
|------|------|-----------|
| `VALIDATION_ERROR` | 400 | Ungültige Request-Daten |
| `UNAUTHORIZED` | 401 | Fehlendes/ungültiges Token |
| `FORBIDDEN` | 403 | Unzureichende Berechtigung |
| `NOT_FOUND` | 404 | Resource nicht gefunden |
| `RATE_LIMIT` | 429 | Zu viele Requests |
| `INTERNAL_ERROR` | 500 | Server-Fehler |

## Endpoints

| Method | Path | Beschreibung |
|--------|------|-------------|
| GET | `/api/v1/status` | System-Status |
| GET | `/api/v1/jobs` | Alle Jobs |
| POST | `/api/v1/jobs/:id/trigger` | Job manuell starten |
| GET | `/api/v1/history` | Backup-History |
| GET | `/api/v1/targets` | Alle Targets |
| GET | `/api/v1/widget/status` | Dashboard-Widget |
| GET | `/metrics` | Prometheus Metrics |

Details: [Alle Endpoints](endpoints.md)

## Quick Start

```bash
curl -X GET "http://192.168.1.100:3000/api/v1/status" \
  -H "Authorization: Bearer helbackup_YOUR_TOKEN"
```

Mehr Beispiele: [curl](examples/curl.md) | [Python](examples/python.md) | [Node.js](examples/nodejs.md) | [PowerShell](examples/powershell.md)

## OpenAPI / Swagger

```
http://YOUR-UNRAID-IP:3000/api/docs
```

---
Weiter: [Endpoints](endpoints.md) | [Beispiele](examples/curl.md)
