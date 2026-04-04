# Gotify Notifications

Gotify is a self-hosted push notification server.

## Install Gotify (Unraid)

1. Community Apps → search "Gotify"
2. Install, port 8080
3. Create admin account

## Create App Token

1. Open Gotify WebUI
2. Apps → "Create Application"
3. Name: "HELBACKUP"
4. Copy token

## Configure HELBACKUP

```
Settings → Notifications → Gotify:

URL: http://192.168.1.100:8080
Token: [Gotify App Token]
Priority: 5
```

Priority values:
- 1-3: Low (no sound)
- 4-7: Normal
- 8-10: High (persistent notification)

## Test Connection

Click "Test" → Gotify app should receive test message.

---
Back: [Notifications Overview](overview.md)
