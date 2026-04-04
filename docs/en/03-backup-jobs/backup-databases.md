# Database Backups

## Supported Databases

| Database | Method | Container Image |
|----------|--------|-----------------|
| MariaDB | mysqldump | mariadb, linuxserver/mariadb |
| MySQL | mysqldump | mysql |
| PostgreSQL | pg_dump | postgres, linuxserver/postgres |
| Redis | SAVE + file copy | redis |
| MongoDB | mongodump | mongo |
| SQLite | File copy | (any) |

## Configure MariaDB Backup

```
Backup Type: Database
Database Type: MariaDB
Container Name: mariadb
Database: nextcloud
Username: root
Password: [your root password]
Dump Options: --single-transaction --routines --events
```

**Important:** `--single-transaction` enables consistent backup without stopping the container!

## PostgreSQL Backup

```
Backup Type: Database
Database Type: PostgreSQL
Container Name: postgres
Database: immich
Username: postgres
Password: [your password]
```

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
