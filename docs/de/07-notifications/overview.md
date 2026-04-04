# Benachrichtigungen

## Unterstützte Kanäle

| Kanal | Typ | Kosten |
|-------|-----|--------|
| Email | SMTP | Kostenlos (eigener Server) |
| Gotify | Self-hosted Push | Kostenlos |
| ntfy | Self-hosted/Cloud Push | Kostenlos / $1/Monat |
| Pushover | Mobile Push | $5 einmalig |
| Telegram | Bot API | Kostenlos |
| Discord | Webhook | Kostenlos |
| Slack | Webhook | Kostenlos |

## Events

| Event | Beschreibung |
|-------|-------------|
| `backup_started` | Job gestartet |
| `backup_success` | Job erfolgreich |
| `backup_failed` | Job fehlgeschlagen |
| `backup_warning` | Job mit Warnung |
| `verification_failed` | Verifikation fehlgeschlagen |
| `disk_space_low` | Ziel-Speicher fast voll |

## Empfohlene Events aktivieren

**Minimum:**
- `backup_failed`
- `disk_space_low`

**Empfohlen:**
- `backup_failed`
- `backup_warning`
- `verification_failed`
- `disk_space_low`
- `backup_success` (optional, viele Nachrichten)

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
1. Google Account → Sicherheit → 2FA aktivieren
2. App-Passwörter → "Mail" → Passwort generieren

Details: [Email konfigurieren](email.md)

## Gotify Setup

```
URL: http://192.168.1.100:8080
Token: [Gotify App Token]
Priority: 5
```

Details: [Gotify konfigurieren](gotify.md)

## Telegram Setup

```
Bot Token: [von @BotFather]
Chat ID: [von @userinfobot]
```

## Discord Setup

```
Webhook URL: https://discord.com/api/webhooks/...
```

---
Weiter: [Email konfigurieren](email.md) | [Gotify konfigurieren](gotify.md)
