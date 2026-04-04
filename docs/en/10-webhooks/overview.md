# Webhooks

## What are Webhooks?

Webhooks are HTTP callbacks that HELBACKUP sends to external systems on events.

**Use cases:**
- Home Assistant notifications
- Custom monitoring
- Automation workflows
- Slack/Discord notifications

## Create Webhook

1. Settings → Webhooks → "New Webhook"
2. Configure:

```
Name: Home Assistant
URL: http://homeassistant.local:8123/api/webhook/helbackup
Secret: [optional, for HMAC signing]
Events:
  ✅ backup_success
  ✅ backup_failed
  ✅ disk_space_low
```

## Events

| Event | Trigger |
|-------|---------|
| `backup_started` | Job started |
| `backup_success` | Backup successful |
| `backup_failed` | Backup failed |
| `backup_warning` | Backup with warning |
| `verification_failed` | Verification failed |
| `disk_space_low` | < 10% storage free |

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

## HMAC Signing

When secret is configured, HELBACKUP sends:
```
X-HELBACKUP-Signature: sha256=abc123...
```

Verification (Python):
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

On failure (HTTP != 2xx):
- 3 attempts
- Exponential backoff: 30s, 60s, 120s
- After 3 failures: Webhook disabled + notification sent

---
Next: [Home Assistant Integration](../12-integrations/home-assistant.md)
