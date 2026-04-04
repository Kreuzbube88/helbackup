# Notifications

## Supported Channels

| Channel | Type | Cost |
|---------|------|------|
| Email | SMTP | Free (own server) |
| Gotify | Self-hosted Push | Free |
| ntfy | Self-hosted/Cloud Push | Free / $1/month |
| Pushover | Mobile Push | $5 one-time |
| Telegram | Bot API | Free |
| Discord | Webhook | Free |
| Slack | Webhook | Free |

## Events

| Event | Description |
|-------|-------------|
| `backup_started` | Job started |
| `backup_success` | Job successful |
| `backup_failed` | Job failed |
| `backup_warning` | Job with warning |
| `verification_failed` | Verification failed |
| `disk_space_low` | Target storage almost full |

## Recommended Events

**Minimum:**
- `backup_failed`
- `disk_space_low`

**Recommended:**
- `backup_failed`
- `backup_warning`
- `verification_failed`
- `disk_space_low`
- `backup_success` (optional, many messages)

## Email Setup

```
SMTP Server: smtp.gmail.com
Port: 587
TLS: STARTTLS
Username: your-email@gmail.com
Password: [App Password]
From: HELBACKUP <your-email@gmail.com>
To: admin@example.com
```

**Gmail App Password:**
1. Google Account → Security → Enable 2FA
2. App Passwords → "Mail" → Generate password

## Gotify Setup

```
URL: http://192.168.1.100:8080
Token: [Gotify App Token]
Priority: 5
```

## Telegram Setup

```
Bot Token: [from @BotFather]
Chat ID: [from @userinfobot]
```

## Discord Setup

```
Webhook URL: https://discord.com/api/webhooks/...
```

---
Next: [Email Setup](email.md) | [Gotify Setup](gotify.md)
