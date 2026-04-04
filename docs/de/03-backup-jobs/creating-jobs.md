# Backup Jobs erstellen

## Was ist ein Backup Job?

Ein Job definiert:
- **Was** gesichert wird (Backup Types)
- **Wann** gesichert wird (Schedule/Cron)
- **Wohin** gesichert wird (Target)
- **Wie** gesichert wird (Encryption, Hooks, etc.)

## Job erstellen

1. **Navigation:** Jobs → "New Job"
2. Felder ausfüllen:

```
Name: Daily Full Backup
Target: Local Backups
Schedule: 0 2 * * *  (täglich 02:00 Uhr)
Enabled: ✅
```

3. Backup Types wählen:
```
✅ Flash Drive
✅ Appdata
☐ VMs
☐ Docker Images
```

4. "Save" klicken

## Job sofort ausführen

Jobs-Seite → Job → "Run Now"

## Job Status

| Status | Bedeutung |
|--------|-----------|
| Success | Backup erfolgreich |
| Failed | Fehler (Logs prüfen) |
| Running | Gerade aktiv |
| Disabled | Deaktiviert |
| Scheduled | Wartet auf Schedule |

---
Weiter: [Scheduling (Cron)](scheduling.md) | [Alle Backup Types](backup-types.md)
