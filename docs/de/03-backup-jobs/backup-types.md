# Backup Types

## Flash Drive

Sichert Unraid Boot-Konfiguration von `/boot`.

**Was wird gesichert:**
- Unraid Lizenz
- Netzwerkkonfiguration
- Plugin-Liste
- Docker-Templates
- Shares-Konfiguration
- Alle Go-Scripts

**Ausgeschlossen:**
- `previous/` Verzeichnis
- `System Volume Information/`

**Besonderheiten:**
- SHA-256 Checksum Verifikation
- Config-Export als JSON
- Schnell (~5-30 Sekunden)

**Quellpfad:** Konfigurierbar unter **Einstellungen → Backup → Flash-Quellpfad** (Standard: `/unraid/boot`).

## Appdata

Sichert Docker Container-Konfigurationen vom konfigurierten Quellpfad.

**Optionen:**
```
Stop containers before backup: ✅ (empfohlen!)
Stop Delay: 10  (Sekunden Wartezeit nach Container-Stop)
Container restart after: ✅
Restart Delay: 5  (Sekunden Wartezeit nach Container-Restart)
Database Dumps: ✅ (optional — Datenbanken vor dem Stoppen sichern)
```

`stopDelay` und `restartDelay` sind konfigurierbar (Standard: 10s / 5s). Auf `0` setzen um den Sleep zu überspringen — für schnelle Container ok, für Datenbank-Container erhöhen.

**Ausgeschlossen (automatisch):**
- `*/logs/*`
- `*/cache/*`
- `*/*.log`

**Quellpfad:** Konfigurierbar unter **Einstellungen → Backup → Appdata-Quellpfad** (Standard: `/unraid/cache/appdata`). Für Pfade außerhalb der vorgemounteten Volumes muss ein entsprechendes Volume-Mount in `docker-compose.yml` eingetragen werden → [Docker Erweiterte Konfiguration](../13-advanced/docker-advanced.md).

**Docker Config Export:** Alle Container-Templates werden als JSON exportiert.

**Datenbankdumps (optional):** Bei Aktivierung erkennt HELBACKUP Datenbank-Container (MariaDB, PostgreSQL, MongoDB) und sichert diese vor dem Stoppen. Unterstützte Typen: MariaDB/MySQL, PostgreSQL, MongoDB, Redis. Aktivierung über "Database Dumps" Checkbox in der Appdata-Step-Konfiguration.

Details: [Datenbank-Backup](backup-databases.md)

## Virtual Machines (VMs)

Sichert VM-Disk-Images vom konfigurierten Quellpfad.

**Ablauf:**
1. Libvirt Snapshot (wenn VM läuft)
2. Rsync der vDisk-Dateien
3. XML-Export der VM-Konfiguration
4. Snapshot löschen

**Quellpfad:** Konfigurierbar unter **Einstellungen → Backup → VMs-Quellpfad** (Standard: `/unraid/cache/domains`).

**Wichtig:** VMs sollten gestoppt sein für konsistentes Backup!

## Docker Images

Sichert Docker Images als `.tar` Dateien.

**Ablauf:**
1. Laufende Images via Docker API abrufen
2. `docker save` → `.tar` Datei
3. In Target speichern

**Achtung:** Images können groß sein (1-5 GB pro Image)!

## System Config

Exportiert Unraid-Systemkonfiguration als JSON:
- Netzwerkkonfiguration
- User-Einstellungen
- Shares
- Plugins
- Disk Assignments

## Databases

Sichert Datenbanken aus laufenden Containern.

Unterstützte Typen:
- **MariaDB / MySQL:** `mysqldump`
- **PostgreSQL:** `pg_dump`
- **Redis:** `SAVE` Befehl
- **MongoDB:** `mongodump`
- **SQLite:** Datei-Kopie

Details: [Datenbank-Backup](backup-databases.md)

## Custom Paths

Sichert beliebige Pfade, die von den Standard-Typen nicht abgedeckt werden.

**Konfiguration:**
```
Source Path: /unraid/user/data/mein-ordner
Target: Local Backups
Exclude Patterns: *.tmp, *.log, cache/
Encryption: ☐ (optional)
```

**Ablauf:**
1. Quellpfad validieren
2. Rsync in Target: `custom/<ordnername>/<YYYY-MM-DD>/`
3. Optional: GPG-Verschlüsselung (tar.gz → .gpg)

> **Hinweis:** Der Pfad muss im Container erreichbar sein. Unraid-Pfade über `/unraid/user/...` oder `/unraid/cache/...` angeben.

---
Zurück: [Jobs erstellen](creating-jobs.md)
