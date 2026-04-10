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

### Appdata auf dem Cache-Laufwerk (häufigster Fall)

Bei vielen Unraid-Installationen liegt Appdata auf dem Cache-Laufwerk (`/mnt/cache/appdata`).
Das Cache-Laufwerk ist in HELBACKUP bereits standardmäßig als `/mnt/cache` eingebunden.

Im **Datei-Browser** (Einstellungen → Backup → Appdata-Quellpfad → Durchsuchen) gibt es
einen **Schnellzugriff-Button "Cache-Laufwerk"** der direkt zu `/mnt/cache` navigiert —
dort ist `appdata` ohne weitere Konfiguration erreichbar und auswählbar.

Danach in HELBACKUP: **Einstellungen → Backup → Appdata-Quellpfad** auf `/mnt/cache/appdata` setzen.

### Appdata auf einem anderen Pool (z. B. SSD-Pool)

Liegt Appdata auf einem weiteren Pool (z. B. `/mnt/ssd/dockers`), muss der Pfad zusätzlich
in `docker-compose.yml` eingebunden werden:

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
