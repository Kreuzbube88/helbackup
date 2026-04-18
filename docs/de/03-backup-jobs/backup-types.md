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

Sichert die Appdata-Verzeichnisse der ausgewählten Docker-Container.

**Optionen:**
```
Stop containers before backup: ✅ (empfohlen!)
Stop Delay: 10  (Sekunden Wartezeit nach Container-Stop)
Container restart after: ✅
Restart Delay: 5  (Sekunden Wartezeit nach Container-Restart)
Database Dumps: ✅ (optional — Datenbanken vor dem Stoppen sichern)
```

`stopDelay` und `restartDelay` sind konfigurierbar (Standard: 10s / 5s). Auf `0` setzen um den Sleep zu überspringen — für schnelle Container ok, für Datenbank-Container erhöhen.

### Container-Modus

HELBACKUP unterstützt zwei Modi für die Auswahl der zu sichernden Container:

**Manuell (Standard):** Container werden einzeln ausgewählt. Die Liste bleibt bei neuen Containern unverändert — neue Container müssen manuell hinzugefügt werden.

**Alle (Dynamisch):** HELBACKUP ermittelt die Container-Liste automatisch zur Laufzeit über den Docker Socket. Neu hinzugefügte Container werden beim nächsten Job-Lauf automatisch einbezogen — keine manuelle Anpassung nötig.

Im dynamischen Modus stehen zwei weitere Optionen zur Verfügung:

- **Ausschlussliste:** Container, die dauerhaft vom Backup ausgenommen werden sollen (z.B. temporäre Container oder solche mit eigenem Backup-Mechanismus).
- **Prioritätsreihenfolge (Stop-Order):** Container, die als erstes gestoppt werden sollen (in der angegebenen Reihenfolge). Alle anderen Container folgen in alphabetischer Reihenfolge. Sinnvoll, wenn bestimmte Container zuerst sauber beendet werden müssen (z.B. Datenbank-Container vor abhängigen Diensten).

> HELBACKUP selbst wird in beiden Modi grundsätzlich vom Backup ausgeschlossen.

Im dynamischen Modus funktioniert auch die "Database Dumps"-Funktion: Datenbank-Container werden automatisch aus der aufgelösten Container-Liste erkannt.

**Pfadauflösung via Docker API:** Für jeden ausgewählten Container liest HELBACKUP die tatsächlichen Bind-Mount-Pfade über `docker inspect` und sichert nur Verzeichnisse, die `/appdata/` im Host-Pfad enthalten. Die Sicherung ist damit nicht an den Containernamen gebunden — ein Container dessen Appdata unter einem abweichenden Pfad liegt (z.B. `/mnt/cache/appdata/mein-jellyfin-config`) wird korrekt gesichert.

**Voraussetzung:** Die Appdata der Container muss unter einem Pfad gespeichert sein, der `/appdata/` enthält (z.B. `/mnt/cache/appdata/`, `/mnt/user/appdata/`). Bind-Mounts auf nicht gemappten Laufwerken werden mit einer Warnung im Job-Log übersprungen. Für Appdata auf nicht-standardmäßigen Laufwerken muss ein entsprechendes Volume-Mount in `docker-compose.yml` eingetragen werden → [Docker Erweiterte Konfiguration](../13-advanced/docker-advanced.md).

**Ausgeschlossen (automatisch, pro Container):**
- `logs/`
- `cache/`
- `*.log`

**Fallback-Quellpfad:** Konfigurierbar unter **Einstellungen → Backup → Appdata-Quellpfad** (Standard: `/unraid/cache/appdata`). Wird nur verwendet, wenn Docker inspect keine `/appdata/`-Bind-Mounts für einen Container liefert.

**Docker Config Export:** Alle Container-Konfigurationen werden als JSON exportiert.

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
