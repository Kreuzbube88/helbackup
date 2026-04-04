# Referenz

## Inhalt

- [Environment Variables](environment-variables.md)
- [Datenbank-Schema](database-schema.md)
- [Konfigurationsoptionen](configuration.md)
- [Cron Referenz](cron-reference.md)

## Cron Referenz

| Ausdruck | Bedeutung |
|----------|-----------|
| `@hourly` | `0 * * * *` |
| `@daily` | `0 0 * * *` |
| `@weekly` | `0 0 * * 0` |
| `@monthly` | `0 0 1 * *` |
| `@yearly` | `0 0 1 1 *` |

## Unterstützte Rsync Flags

```
-a    Archive (rekursiv + Permissions)
-z    Kompression
--checksum    SHA-256 statt Timestamp
--bwlimit=50M Bandbreite begrenzen
--delete      Gelöschte Dateien entfernen
--partial     Unterbrochene Transfers fortsetzen
```

---
Weiter: [Environment Variables](environment-variables.md)
