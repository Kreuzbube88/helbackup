# Datenbank-Backups

## Unterstützte Datenbanken

| Datenbank | Methode | Container-Image |
|-----------|---------|-----------------|
| MariaDB | mysqldump | mariadb, linuxserver/mariadb |
| MySQL | mysqldump | mysql |
| PostgreSQL | pg_dump | postgres, linuxserver/postgres |
| Redis | SAVE + Datei-Kopie | redis |
| MongoDB | mongodump | mongo |
| SQLite | Datei-Kopie | (beliebig) |

## MariaDB Backup konfigurieren

```
Backup Type: Database
Database Type: MariaDB
Container Name: mariadb
Database: nextcloud
Username: root
Password: [dein Root-Passwort]
Dump Options: --single-transaction --routines --events
```

**Wichtig:** `--single-transaction` ermöglicht konsistentes Backup ohne Container-Stop!

## PostgreSQL Backup

```
Backup Type: Database
Database Type: PostgreSQL
Container Name: postgres
Database: immich
Username: postgres
Password: [dein Passwort]
```

## Was wird gespeichert?

Backup enthält:
```
backup_2024-01-15/
└── databases/
    ├── nextcloud_dump.sql.gz
    ├── immich_dump.sql.gz
    └── manifest.json
```

## Restore einer Datenbank

1. Recovery → Backup auswählen
2. Restore Type: "Database Only"
3. Target Container auswählen
4. "Start Restore"

HELBACKUP führt aus:
```bash
# MariaDB
mysql -u root -p nextcloud < dump.sql

# PostgreSQL
psql -U postgres immich < dump.sql
```

## Best Practices

- Immer `--single-transaction` für InnoDB (kein Lock nötig)
- Passwörter werden verschlüsselt in DB gespeichert
- Dumps werden komprimiert (gzip): 60-80% kleiner
- Tägliche Datenbank-Backups empfohlen

---
Zurück: [Backup Types](backup-types.md)
