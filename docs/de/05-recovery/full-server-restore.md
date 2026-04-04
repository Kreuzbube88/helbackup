# Full Server Restore (Disaster Recovery)

## Wann Full Server Restore?

- Unraid-Array komplett ausgefallen
- Alle Daten verloren
- Neuer Server / neue Hardware
- Komplette Migration

## Voraussetzungen

- Neuer/wiederhergestellter Unraid Server
- HELBACKUP Container läuft
- Zugang zum Backup-Target
- Recovery Key (wenn verschlüsselt)

## Wizard starten

1. **Navigation:** Recovery → "Full Server Restore"
2. Wizard öffnet sich:

### Schritt 1: Backup auswählen

```
Target: Local Backups / NAS / Cloud
Backup: backup_2024-01-15_020000
Date: 15. Januar 2024, 02:00 Uhr
Size: 45 GB
Components: Flash, Appdata (12 Container), VMs (2), Databases (3)
```

### Schritt 2: Restore-Komponenten wählen

```
✅ Flash Drive (Unraid Konfiguration)
✅ Appdata (alle Container)
✅ Virtual Machines
✅ Docker Images
✅ Databases
☐ System Config (optional)
```

### Schritt 3: Pre-Flight Check

HELBACKUP prüft automatisch:
```
✅ Target erreichbar
✅ Backup vollständig (SHA-256 verified)
✅ Genug Speicher verfügbar (45 GB benötigt, 500 GB frei)
✅ Unraid Array gestartet
⚠️ Container laufen bereits (werden gestoppt)
```

### Schritt 4: Dry Run (empfohlen)

```
Dry Run: ✅ aktiviert
"Start Restore" → Simulation läuft...

Would restore:
- Flash Drive: 245 files
- Appdata: 12 containers, 23.4 GB
- VMs: 2 VMs, 18.2 GB
- Databases: 3 dumps, 1.2 GB
Total: ~43 GB
```

### Schritt 5: Echter Restore

```
Dry Run: ☐ deaktiviert
Overwrite existing: ✅
"Start Restore"
```

**Restore-Reihenfolge (automatisch):**
1. Flash Drive (Basis-Konfiguration)
2. Docker Images
3. Databases
4. Appdata
5. VMs

## Restore-Monitoring

Live-Logs während Restore:
```
[14:23:01] Starting Full Server Restore
[14:23:02] Restoring Flash Drive...
[14:23:08] Flash Drive restored (245 files, 6s)
[14:23:09] Restoring Docker Images (3)...
[14:35:22] Docker Images restored (3/3, 12m 13s)
[14:35:23] Restoring Databases...
[14:37:45] Databases restored (3/3, 2m 22s)
[14:37:46] Restoring Appdata (12 containers)...
[15:02:11] Appdata restored (12/12, 24m 25s)
[15:02:12] Restoring VMs...
[15:23:55] VMs restored (2/2, 21m 43s)
[15:23:56] Full Server Restore completed!
Total time: 61m 55s
```

## Nach dem Restore

1. Unraid neu starten
2. Container prüfen: Alle gestartet?
3. Daten prüfen: Stichproben testen
4. Services testen (Nextcloud, Plex, etc.)

---
Zurück: [Recovery Overview](overview.md)
