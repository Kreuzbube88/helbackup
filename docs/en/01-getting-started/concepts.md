# Core Concepts

## Architecture

```
Unraid Server
└── HELBACKUP Container (Docker)
    ├── Fastify Backend (/api/*)
    ├── React Frontend (SPA)
    ├── SQLite Database
    └── Job Orchestrator (cron-based)
```

## Key Concepts

### Backup Target
Where backups are stored.
- **Local:** Directly on Unraid disks
- **NAS:** Synology/QNAP via SSH+Rsync
- **Cloud:** 40+ providers via Rclone

### Backup Job
Defines what gets backed up and when.
- Schedule (Cron)
- Backup Types (Flash, Appdata, VMs, etc.)
- Target
- Hooks (Pre/Post Scripts)

### Backup Types

| Type | Source | Note |
|------|--------|------|
| Flash Drive | /boot | Unraid configuration |
| Appdata | /mnt/user/appdata | Container data |
| VMs | /mnt/user/domains | Virtual machines |
| Docker Images | Docker Socket | Images as .tar |
| System Config | System | Network, users, shares |
| Databases | Container | MariaDB, PostgreSQL, etc. |

### Retention
How long backups are kept.
- **Simple:** X days
- **GFS (Grandfather-Father-Son):** Daily/Weekly/Monthly/Yearly → 80-90% storage savings

### Encryption
Optional: AES-256 encryption.
- Recovery Key = only way to access encrypted backups
- Lost key = lost backups

---
Next: [Create First Target](../02-backup-targets/overview.md)
