# Hooks (Pre/Post Scripts)

## What are Hooks?

Hooks are shell scripts that HELBACKUP executes before or after a backup job.

## Allowed Locations

For security reasons, hook scripts are only executed from these container directories:

| Container path | Host path (Unraid default) |
|---|---|
| `/app/config/hooks` | `/mnt/user/appdata/helbackup/config/hooks` |
| `/app/data/hooks` | `/mnt/user/appdata/helbackup/data/hooks` |

Paths outside these directories are rejected and the job fails with `Hook path not allowed`.

## Configure Hooks

Place the scripts on the host, e.g. `/mnt/user/appdata/helbackup/config/hooks/`, then enter the **container path** in the job editor:
```
Pre-Backup Hook:  /app/config/hooks/pre-backup.sh
Post-Backup Hook: /app/config/hooks/post-backup.sh
```

Scripts must be executable:
```bash
chmod +x /mnt/user/appdata/helbackup/config/hooks/pre-backup.sh
```

Scripts may use `#!/bin/bash` or `#!/bin/sh` — both are available in the container.

## Pre-Hook Examples

### Stop Containers

```bash
#!/bin/bash
echo "Stopping containers..."
docker stop nextcloud mariadb
sleep 5
echo "Containers stopped."
```

### Database Flush

```bash
#!/bin/bash
docker exec mariadb mysqladmin flush-tables
echo "Database flushed."
```

### Pre-Flight Check

```bash
#!/bin/bash
# Check if enough disk space
AVAIL=$(df /mnt/user --output=avail | tail -1)
MIN_KB=$((50 * 1024 * 1024))  # 50 GB

if [ "$AVAIL" -lt "$MIN_KB" ]; then
  echo "ERROR: Not enough disk space!" >&2
  exit 1
fi
echo "Disk space OK: ${AVAIL}KB available"
```

## Post-Hook Examples

### Start Containers

```bash
#!/bin/bash
echo "Starting containers..."
docker start nextcloud mariadb
echo "Done."
```

### Send Notification

```bash
#!/bin/bash
curl -s -X POST "https://ntfy.sh/my-topic" \
  -d "Backup completed successfully!"
```

## Exit Codes

- **0:** Success, continue backup
- **2:** Skip requested — the backup is aborted, logged as a skip (pre-hooks)
- **other != 0:** Error, abort backup (for pre-hooks)

## Logging

Hook output is written to backup log:
```
[02:00:01] Running pre-backup hook...
[02:00:01] Stopping containers...
[02:00:06] Containers stopped.
[02:00:07] Starting backup...
```

---
Back: [Advanced Overview](overview.md)
