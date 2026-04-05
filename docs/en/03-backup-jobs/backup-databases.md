# Database Backups

Database dumps are a feature of the **Appdata** backup step. Enable the "Database Dumps" checkbox in the Appdata step configuration. HELBACKUP automatically detects database containers by image name and runs the appropriate dump before stopping containers.

## Supported Databases

| Database | Method | Container Image |
|----------|--------|-----------------|
| MariaDB | mysqldump | mariadb, linuxserver/mariadb |
| MySQL | mysqldump | mysql |
| PostgreSQL | pg_dumpall | postgres, linuxserver/postgres |
| Redis | (filesystem backup) | redis |
| MongoDB | mongodump | mongo |

## Enable Database Dumps

In the Job Wizard → Backup Types → Appdata:
```
☑ Database Dumps
```

HELBACKUP will detect database containers from your selected container list and dump them before stopping.

## PostgreSQL / MariaDB

HELBACKUP connects to the container and runs `pg_dumpall` (PostgreSQL) or `mysqldump --all-databases` (MariaDB/MySQL) using credentials from the container's environment variables.

## What Gets Stored?

Backup contains:
```
backup_2024-01-15/
└── databases/
    ├── nextcloud_dump.sql.gz
    ├── immich_dump.sql.gz
    └── manifest.json
```

## Restore a Database

1. Recovery → Select backup
2. Restore Type: "Database Only"
3. Select target container
4. "Start Restore"

HELBACKUP executes:
```bash
# MariaDB
mysql -u root -p nextcloud < dump.sql

# PostgreSQL
psql -U postgres immich < dump.sql
```

## Best Practices

- Always use `--single-transaction` for InnoDB (no lock needed)
- Passwords stored encrypted in DB
- Dumps compressed (gzip): 60-80% smaller
- Daily database backups recommended

---
Back: [Backup Types](backup-types.md)
