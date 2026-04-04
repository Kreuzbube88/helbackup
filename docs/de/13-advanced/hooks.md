# Hooks (Pre/Post Scripts)

## Was sind Hooks?

Hooks sind Shell-Skripte die HELBACKUP vor oder nach einem Backup-Job ausführt.

## Hook konfigurieren

Im Job-Editor:
```
Pre-Backup Hook:  /mnt/user/scripts/pre-backup.sh
Post-Backup Hook: /mnt/user/scripts/post-backup.sh
```

Skripte müssen ausführbar sein:
```bash
chmod +x /mnt/user/scripts/pre-backup.sh
```

## Pre-Hook Beispiele

### Container stoppen

```bash
#!/bin/bash
echo "Stopping containers..."
docker stop nextcloud mariadb
sleep 5
echo "Containers stopped."
```

### Datenbank-Flush

```bash
#!/bin/bash
docker exec mariadb mysqladmin flush-tables
echo "Database flushed."
```

### Pre-Flight Check

```bash
#!/bin/bash
# Prüfen ob genug Speicher frei
AVAIL=$(df /mnt/user --output=avail | tail -1)
MIN_KB=$((50 * 1024 * 1024))  # 50 GB

if [ "$AVAIL" -lt "$MIN_KB" ]; then
  echo "ERROR: Not enough disk space!" >&2
  exit 1
fi
echo "Disk space OK: ${AVAIL}KB available"
```

## Post-Hook Beispiele

### Container starten

```bash
#!/bin/bash
echo "Starting containers..."
docker start nextcloud mariadb
echo "Done."
```

### Benachrichtigung senden

```bash
#!/bin/bash
curl -s -X POST "https://ntfy.sh/my-topic" \
  -d "Backup completed successfully!"
```

## Exit Codes

- **0:** Erfolg, Backup fortsetzen
- **!= 0:** Fehler, Backup abbrechen (bei Pre-Hook)

## Logging

Hook-Output wird in Backup-Log geschrieben:
```
[02:00:01] Running pre-backup hook...
[02:00:01] Stopping containers...
[02:00:06] Containers stopped.
[02:00:07] Starting backup...
```

---
Zurück: [Advanced Overview](overview.md)
