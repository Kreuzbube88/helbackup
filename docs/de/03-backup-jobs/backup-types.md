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
Container restart after: ✅
```

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

---
Zurück: [Jobs erstellen](creating-jobs.md)
