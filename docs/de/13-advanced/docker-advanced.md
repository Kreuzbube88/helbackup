# Docker — Erweiterte Konfiguration

## Docker Socket

HELBACKUP kommuniziert mit Docker via Unix Socket:
```
/var/run/docker.sock → /var/run/docker.sock (im Container)
```

Wird genutzt für:
- Container stoppen/starten
- Docker Images sichern (`docker save`)
- Container-Status prüfen

## Docker Images Backup

Alle laufenden Container-Images sichern:

```
Backup Type: Docker Images
Include: all running
```

Images werden als `.tar` gespeichert:
```
backup_2024-01-15/
└── docker-images/
    ├── nextcloud_latest.tar
    ├── mariadb_10.11.tar
    └── manifest.json
```

**Achtung:** Images können sehr groß sein (1-5 GB pro Image)!

Empfehlung: Docker Images nur wöchentlich oder monatlich sichern.

## Container Auto-Stop / Auto-Start

Job-Konfiguration:
```
Stop containers before backup: ✅
Containers to stop: nextcloud, mariadb
Wait after stop: 10 seconds
Start containers after backup: ✅
```

Wenn "all appdata containers" aktiviert: HELBACKUP stoppt alle Container die Appdata-Daten schreiben.

## Benutzerdefinierte Volume-Mounts für Appdata

Standardmäßig erwartet HELBACKUP Appdata unter `/unraid/user/appdata`.
Liegt Appdata auf einem anderen Pool (z. B. `/mnt/cache/appdata` oder `/mnt/ssd/dockers`),
muss das Verzeichnis als zusätzliches Volume in `docker-compose.yml` eingebunden werden.

**Beispiel — docker-compose.yml:**
```yaml
volumes:
  - /mnt/user/appdata/helbackup:/app/config
  - /mnt/ssd/dockers:/unraid/ssd      # ← eigenen Pool einbinden
```

Danach in HELBACKUP: **Einstellungen → Backup → Appdata-Quellpfad** auf `/unraid/ssd` setzen.

**Wichtig:**
- HELBACKUP modifiziert `docker-compose.yml` oder `helbackup.xml` nicht selbst
- Erlaubte Pfad-Bases im Container: `/unraid/`, `/mnt/`, `/app/`
- Nach Änderung der `docker-compose.yml`: Container neu starten (`docker compose up -d`)

---
Zurück: [Advanced Overview](overview.md)
