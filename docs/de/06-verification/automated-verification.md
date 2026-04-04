# Automatische Verifikation

## Verifikation nach Backup

In der Job-Konfiguration aktivieren:

```
Verify after backup: ✅ Quick
```

Quick Verify wird nach jedem erfolgreichen Backup automatisch ausgeführt.

## Geplante Full Verifikation

Separate Verifikations-Schedules konfigurieren:

```
Full Verify Schedule: 0 4 * * 0
```

Empfehlung: Wöchentlich Sonntag 04:00 (wenn wenig Aktivität).

## Verifikations-Benachrichtigungen

Bei Fehler wird automatisch Benachrichtigung gesendet (wenn `verification_failed` Event aktiviert):

```
Settings → Notifications → Events:
✅ verification_failed
```

---
Zurück: [Verifikation Overview](overview.md)
