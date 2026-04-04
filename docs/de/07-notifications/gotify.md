# Gotify Benachrichtigungen

Gotify ist ein self-hosted Push-Notification-Server.

## Gotify installieren (Unraid)

1. Community Apps → "Gotify" suchen
2. Installieren, Port 8080
3. Admin-Account anlegen

## App Token erstellen

1. Gotify WebUI öffnen
2. Apps → "Create Application"
3. Name: "HELBACKUP"
4. Token kopieren

## HELBACKUP konfigurieren

```
Settings → Notifications → Gotify:

URL: http://192.168.1.100:8080
Token: [Gotify App Token]
Priority: 5
```

Priority-Werte:
- 1-3: Niedrig (kein Sound)
- 4-7: Normal
- 8-10: Hoch (persistente Benachrichtigung)

## Verbindung testen

"Test" klicken → Gotify-App sollte Test-Nachricht empfangen.

---
Zurück: [Notifications Overview](overview.md)
