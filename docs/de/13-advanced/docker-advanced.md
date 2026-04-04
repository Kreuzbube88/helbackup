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

---
Zurück: [Advanced Overview](overview.md)
