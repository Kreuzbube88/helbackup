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

## Appdata

Sichert Docker Container-Konfigurationen von `/mnt/user/appdata`.

**Optionen:**
```
Stop containers before backup: ✅ (empfohlen!)
Stop Delay: 10  (Sekunden Wartezeit nach Container-Stop)
Container restart after: ✅
Restart Delay: 5  (Sekunden Wartezeit nach Container-Restart)
```

`stopDelay` und `restartDelay` sind konfigurierbar (Standard: 10s / 5s). Auf `0` setzen um den Sleep zu überspringen — für schnelle Container ok, für Datenbank-Container erhöhen.

**Ausgeschlossen (automatisch):**
- `*/logs/*`
- `*/cache/*`
- `*/*.log`

**Docker Config Export:** Alle Container-Templates werden als JSON exportiert.

## Virtual Machines (VMs)

Sichert VM-Disk-Images von `/mnt/user/domains`.

**Ablauf:**
1. Libvirt Snapshot (wenn VM läuft)
2. Rsync der vDisk-Dateien
3. XML-Export der VM-Konfiguration
4. Snapshot löschen

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

Konfiguration:
```
Database Type: MariaDB
Container: mariadb
Database: nextcloud
Username: root
Password: [verschlüsselt gespeichert]
```

Details: [Datenbank-Backup](backup-databases.md)

## Custom Paths

Sichert beliebige Pfade, die von den Standard-Typen nicht abgedeckt werden.

**Konfiguration:**
```
Source Path: /mnt/host/user/data/mein-ordner
Target: Local Backups
Exclude Patterns: *.tmp, *.log, cache/
Encryption: ☐ (optional)
```

**Ablauf:**
1. Quellpfad validieren
2. Rsync in Target: `custom/<ordnername>/<YYYY-MM-DD>/`
3. Optional: GPG-Verschlüsselung (tar.gz → .gpg)

> **Hinweis:** Der Pfad muss im Container erreichbar sein. Unraid-Pfade über `/mnt/host/user/...` angeben.

---
Zurück: [Jobs erstellen](creating-jobs.md)
