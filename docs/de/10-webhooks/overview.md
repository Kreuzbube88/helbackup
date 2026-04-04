# Webhooks

## Was sind Webhooks?

Webhooks sind HTTP Callbacks die HELBACKUP bei Events an externe Systeme sendet.

**Anwendungsfälle:**
- Home Assistant Benachrichtigung
- Custom Monitoring
- Automatisierungs-Workflows
- Slack/Discord Benachrichtigungen

## Webhook erstellen

1. Settings → Webhooks → "New Webhook"
2. Konfiguration:

```
Name: Home Assistant
URL: http://homeassistant.local:8123/api/webhook/helbackup
Secret: [optional, für HMAC Signierung]
Events:
  ✅ backup_success
  ✅ backup_failed
  ✅ disk_space_low
```

## Events

| Event | Trigger |
|-------|---------|
| `backup_started` | Job gestartet |
| `backup_success` | Backup erfolgreich |
| `backup_failed` | Backup fehlgeschlagen |
| `backup_warning` | Backup mit Warnung |
| `verification_failed` | Verifikation fehlgeschlagen |
| `disk_space_low` | < 10% Speicher frei |

## Payload Format

```json
{
  "event": "backup_success",
  "timestamp": "2024-01-15T02:00:35Z",
  "data": {
    "jobId": "1",
    "jobName": "Daily Flash Backup",
    "status": "success",
    "duration": 35,
    "size": 12582912,
    "target": "Local Backups"
  },
  "webhook": {
    "id": "wh_1",
    "name": "Home Assistant"
  }
}
```

## HMAC Signierung

Wenn Secret konfiguriert, sendet HELBACKUP:
```
X-HELBACKUP-Signature: sha256=abc123...
```

Verifizierung (Python):
```python
import hmac, hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

## Retry Logic

Bei Fehler (HTTP != 2xx):
- 3 Versuche
- Exponential Backoff: 30s, 60s, 120s
- Nach 3 Fehlern: Webhook deaktiviert + Benachrichtigung

---
Weiter: [Home Assistant Integration](../12-integrations/home-assistant.md)
