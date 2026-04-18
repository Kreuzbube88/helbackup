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

## Dry-Run Modus

Ein Job kann testweise im **Dry-Run Modus** ausgeführt werden. Dabei simuliert rsync den Transfer, ohne Dateien zu schreiben — alle anderen Logik-Schritte (Container stoppen, Pfade auflösen, Logs schreiben) laufen normal durch.

**Was passiert im Dry-Run:**
- rsync läuft mit `--dry-run` — keine Dateien werden geschrieben
- NAS-Transfer, finalize und Manifest-Eintrag werden übersprungen
- Keine Webhook-Benachrichtigungen werden ausgelöst
- VM- und Docker-Image-Schritte werden vollständig übersprungen
- Der Lauf erscheint in der Job-Historie (zur Nachvollziehbarkeit)

**Verwendung:** Dry-Run kann über die API (`POST /api/jobs/:id/trigger` mit `{"dryRun": true}`) oder direkt über den "Jetzt ausführen"-Button in der UI gestartet werden.

Nützlich um zu prüfen, welche Dateien rsync übertragen würde, ohne Speicherplatz zu verbrauchen oder NAS-Verbindungen zu öffnen.

## Bandbreitenlimit pro Job

Für jeden Backup-Step kann ein individuelles **Bandbreitenlimit** konfiguriert werden. Der Wert wird direkt als `--bwlimit` an rsync übergeben.

```
Bandwidth Limit: 50000  (KB/s — 0 = kein Limit)
```

Das Step-Level-Limit hat Vorrang vor dem globalen Limit unter **Einstellungen → Backup → Rsync Bandbreitenlimit**. Wird kein Step-Limit gesetzt, gilt das globale Limit (Standard: 0 = unbegrenzt).

Sinnvoll um Backups auf NAS-Ziele zu drosseln, damit das Netzwerk nicht gesättigt wird.

---
Weiter: [Scheduling (Cron)](scheduling.md) | [Alle Backup Types](backup-types.md)
