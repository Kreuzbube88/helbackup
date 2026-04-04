# Reference

## Contents

- [Environment Variables](environment-variables.md)
- [Database Schema](database-schema.md)
- [Configuration Options](configuration.md)
- [Cron Reference](cron-reference.md)

## Cron Reference

| Expression | Meaning |
|------------|---------|
| `@hourly` | `0 * * * *` |
| `@daily` | `0 0 * * *` |
| `@weekly` | `0 0 * * 0` |
| `@monthly` | `0 0 1 * *` |
| `@yearly` | `0 0 1 1 *` |

## Supported Rsync Flags

```
-a    Archive (recursive + permissions)
-z    Compression
--checksum    SHA-256 instead of timestamp
--bwlimit=50M Bandwidth limit
--delete      Remove deleted files
--partial     Resume interrupted transfers
```

---
Next: [Environment Variables](environment-variables.md)
