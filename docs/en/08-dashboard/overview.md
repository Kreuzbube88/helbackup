# Dashboard

## Dashboard Overview

The Dashboard shows current system status at a glance.

## Widgets

### System Status
```
System Healthy
Array: Online
Jobs: 8 (5 enabled)
Last backup: 2 hours ago
```

### Backup Statistics (24h)
```
Successful:  11
Failed:       0
Warnings:     1
Total size:  45.2 GB
```

### Job Status
Table of all configured jobs:
```
Name              | Status  | Last Run        | Next Run
Flash Backup      | OK      | 02:00 (2h ago)  | Tomorrow 02:00
Appdata Backup    | OK      | 02:05 (2h ago)  | Tomorrow 02:05
VM Backup         | Warning | Sunday 03:00    | Sunday 03:00
```

### Storage Usage
Storage usage per target:
```
Local Backups:  45.2 GB / 500 GB  (9%)
NAS Backups:   123.4 GB / 2 TB    (6%)
B2 Cloud:       23.1 GB / unlimited
```

### Warnings
```
⚠️ VM Backup: VM "ubuntu-dev" was still running during last backup
⚠️ Local Backups: Only 15% storage remaining
```

## Live Logs

Below dashboard: Live-streaming of current backup logs via SSE (Server-Sent Events).

---
Next: [API](../09-api/overview.md)
