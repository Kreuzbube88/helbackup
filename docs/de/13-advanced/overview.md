# Erweiterte Themen

## Inhalt

- [GFS Retention Deep Dive](../02-backup-targets/retention-gfs.md)
- [Performance Tuning](performance-tuning.md)
- [Netzwerk-Optimierung](network-optimization.md)
- [Scripting & Hooks](hooks.md)
- [Docker-in-Docker](docker-advanced.md)

## Hooks (Pre/Post Scripts)

Skripte die vor/nach Backup ausgeführt werden.

**Pre-Hook Anwendungsfälle:**
- Container stoppen
- Datenbank-Flush
- Netzwerk-Check

**Post-Hook Anwendungsfälle:**
- Container starten
- Benachrichtigungen
- Cleanup

Konfiguration im Job:
```
Pre-Backup Hook: /mnt/user/scripts/pre-backup.sh
Post-Backup Hook: /mnt/user/scripts/post-backup.sh
```

Skript-Beispiel:
```bash
#!/bin/bash
# pre-backup.sh
docker stop nextcloud
echo "Nextcloud stopped for backup"
```

---
Weiter: [Performance Tuning](performance-tuning.md)
