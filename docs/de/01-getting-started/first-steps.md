# Erste Schritte

> **Quick-Start-Wizard verfügbar:** Statt dieser manuellen Schritte kannst du den eingebauten Ersten-Backup-Wizard verwenden. Klicke auf **"Quick Start Guide"** im Dashboard, Jobs, Targets oder Recovery, um ihn zu starten. Siehe [Geführte Einrichtung](guided-setup.md) für Details.

In 15 Minuten hast du:
- Ersten Backup Target konfiguriert
- Ersten Backup Job erstellt
- Test-Backup durchgeführt
- Benachrichtigungen eingerichtet

## Schritt 1: Backup Target erstellen

1. **Navigation:** Settings → Targets → "New Target"
2. **Konfiguration:**

```
Name: Local Backups
Type: Local
Path: /mnt/user/backups/helbackup
Encrypted: ☐ (vorerst aus)
Retention: Simple
Retention Days: 30
```

3. "Save" klicken

## Schritt 2: Ersten Backup Job erstellen

1. **Navigation:** Jobs → "New Job"
2. **Konfiguration:**

```
Name: Daily Flash Backup
Target: Local Backups
Schedule: @daily
Backup Types: ✅ Flash Drive
```

3. "Save" klicken

## Schritt 3: Test-Backup

1. Jobs Seite → "Daily Flash Backup" → "Run Now"
2. Fortschritt in Dashboard oder Logs verfolgen

## Schritt 4: Backup verifizieren

1. **Navigation:** Recovery
2. Dein Backup in der Liste finden
3. "Verify" klicken → "Verification successful!"

## Schritt 5: Test-Restore (KRITISCH)

> Ein Backup ist wertlos wenn Restore nicht funktioniert!

1. Backup → "Restore" klicken
2. Dry Run: **aktiviert** (nur Simulation!)
3. Restore to: `/tmp/test-restore`
4. "Start Restore" klicken

## Schritt 6: Notifications

1. **Navigation:** Settings → Notifications
2. Channel wählen (Email, Gotify, ntfy, etc.)
3. Events aktivieren: `backup_success`, `backup_failed`
4. "Test" klicken
5. "Save"

---
Nächste Seite: [Grundkonzepte](concepts.md)
