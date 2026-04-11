# Datenbank-Backups

Datenbank-Dumps sind ein Feature des **Appdata**-Backup-Schritts. Die Option „Datenbank-Dumps" im Appdata-Schritt aktivieren. HELBACKUP erkennt Datenbank-Container automatisch anhand des Image-Namens und führt den Dump vor dem Stoppen der Container aus.

## Unterstützte Datenbanken

| Datenbank | Methode | Container-Image |
|-----------|---------|-----------------|
| MariaDB | mysqldump | mariadb, linuxserver/mariadb |
| MySQL | mysqldump | mysql |
| PostgreSQL | pg_dumpall | postgres, linuxserver/postgres |
| MongoDB | mongodump | mongo |
| Redis | BGSAVE + RDB-Export | redis |

## Datenbank-Dumps aktivieren

Im Job-Wizard → Backup-Typen → Appdata:
```
☑ Datenbank-Dumps
```

HELBACKUP erkennt Datenbank-Container aus der ausgewählten Container-Liste und dumpt sie vor dem Stoppen.

## Zugangsdaten

Zugangsdaten werden **automatisch aus den Umgebungsvariablen des Containers** gelesen — keine manuelle Konfiguration erforderlich.

| Datenbank | Umgebungsvariablen |
|-----------|-------------------|
| MySQL/MariaDB | `MYSQL_ROOT_PASSWORD` (alle DBs) — oder Fallback auf `MYSQL_USER` + `MYSQL_PASSWORD` + `MYSQL_DATABASE` (einzelne App-DB) |
| PostgreSQL | `POSTGRES_USER` (Fallback: `postgres`) |
| MongoDB | `MONGO_INITDB_ROOT_USERNAME` + `MONGO_INITDB_ROOT_PASSWORD` |
| Redis | `REDIS_PASSWORD` oder `REQUIREPASS` |

> Wenn kein Root-Passwort gesetzt ist (z.B. BookStack MySQL), fällt HELBACKUP automatisch auf den App-User zurück und sichert nur die konfigurierte Datenbank.

## Was wird gespeichert?

Dumps werden im Appdata-Backup-Verzeichnis gespeichert:
```
appdata/2024-01-15/
└── database-dumps/
    ├── <containerId>/
    │   ├── mysql_dump.sql       (MySQL/MariaDB)
    │   ├── postgres_dump.sql    (PostgreSQL)
    │   ├── mongodb_dump/        (MongoDB — Verzeichnis)
    │   └── redis_dump.rdb       (Redis)
```

## Datenbank wiederherstellen

Dumps werden während des Restore-Wizards unter `/tmp/db-restore/` bereitgestellt. Manuell in den laufenden Container importieren:

```bash
# MySQL / MariaDB
docker exec -i <container> mysql -u root -p<passwort> < mysql_dump.sql

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

- Container-Stop vor dem Dump aktivieren für Konsistenz
- Tägliche Datenbank-Backups empfohlen
- Restore auf einer separaten Instanz testen bevor er im Ernstfall benötigt wird

---
Zurück: [Backup Types](backup-types.md)
