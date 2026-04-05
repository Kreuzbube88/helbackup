# Dashboard

## Dashboard-Überblick

Das Dashboard zeigt den aktuellen System-Status auf einen Blick.

## Widgets

### System Status
```
System Healthy
Array: Online
Jobs: 8 (5 enabled)
Last backup: 2 hours ago
```

### Backup Statistics (24h)
```
Successful:  11
Failed:       0
Warnings:     1
Total size:  45.2 GB
```

### Job Status
Tabelle aller konfigurierten Jobs:
```
Name              | Status  | Last Run        | Next Run
Flash Backup      | OK      | 02:00 (2h ago)  | Tomorrow 02:00
Appdata Backup    | OK      | 02:05 (2h ago)  | Tomorrow 02:05
VM Backup         | Warning | Sunday 03:00    | Sunday 03:00
```

### Storage Usage
Speicherverbrauch pro Target:
```
Local Backups:  45.2 GB / 500 GB  (9%)
NAS Backups:   123.4 GB / 2 TB    (6%)
B2 Cloud:       23.1 GB / unbegrenzt
```

### Warnings
```
⚠️ VM Backup: VM "ubuntu-dev" war beim letzten Backup noch gestartet
⚠️ Local Backups: Nur noch 15% Speicher frei
```

## Quick Start Guide

Ein **"Quick Start Guide"**-Button ist in der oberen Leiste des Dashboards verfügbar. Ein Klick öffnet den [Ersten-Backup-Wizard](../01-getting-started/guided-setup.md) — eine 5-stufige geführte Einrichtung zum Erstellen des ersten Backup-Targets und Jobs ohne manuelle Konfiguration.

## Live Logs

Unter Dashboard: Live-Streaming der aktuellen Backup-Logs via SSE (Server-Sent Events).

---
Weiter: [API](../09-api/overview.md)
