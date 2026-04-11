# Database Backups

Database dumps are a feature of the **Appdata** backup step. Enable the "Database Dumps" checkbox in the Appdata step configuration. HELBACKUP automatically detects database containers by image name and runs the appropriate dump before stopping containers.

## Supported Databases

| Database | Method | Container Image |
|----------|--------|-----------------|
| MariaDB | mysqldump | mariadb, linuxserver/mariadb |
| MySQL | mysqldump | mysql |
| PostgreSQL | pg_dumpall | postgres, linuxserver/postgres |
| MongoDB | mongodump | mongo |
| Redis | BGSAVE + RDB export | redis |

## Enable Database Dumps

In the Job Wizard → Backup Types → Appdata:
```
☑ Database Dumps
```

HELBACKUP will detect database containers from your selected container list and dump them before stopping.

## Credentials

Credentials are read **automatically from the container's environment variables** — no manual configuration required.

| Database | Environment Variables |
|----------|----------------------|
| MySQL/MariaDB | `MYSQL_ROOT_PASSWORD` (all DBs) — or fallback to `MYSQL_USER` + `MYSQL_PASSWORD` + `MYSQL_DATABASE` (single app DB) |
| PostgreSQL | `POSTGRES_USER` (fallback: `postgres`) |
| MongoDB | `MONGO_INITDB_ROOT_USERNAME` + `MONGO_INITDB_ROOT_PASSWORD` |
| Redis | `REDIS_PASSWORD` or `REQUIREPASS` |

> If no root password is set (e.g. BookStack MySQL), HELBACKUP automatically falls back to the app user and backs up only the configured database.

## What Gets Stored?

Dumps are stored inside the Appdata backup directory:
```
appdata/2024-01-15/
└── database-dumps/
    ├── <containerId>/
    │   ├── mysql_dump.sql       (MySQL/MariaDB)
    │   ├── postgres_dump.sql    (PostgreSQL)
    │   ├── mongodb_dump/        (MongoDB — directory)
    │   └── redis_dump.rdb       (Redis)
```

## Restore a Database

Database dumps are staged at `/tmp/db-restore/` during the restore wizard. Import them manually into the running container:

```bash
# MySQL / MariaDB
docker exec -i <container> mysql -u root -p<password> < mysql_dump.sql

# PostgreSQL
docker exec -i <container> psql -U <user> < postgres_dump.sql

# MongoDB
docker cp mongodb_dump/ <container>:/tmp/
docker exec <container> mongorestore /tmp/mongodb_dump/

# Redis
docker cp redis_dump.rdb <container>:/data/dump.rdb
docker restart <container>
```

## Best Practices

- Enable container stop before dump for consistency
- Daily database backups recommended
- Test restore on a separate instance before relying on it in production

---
Back: [Backup Types](backup-types.md)
