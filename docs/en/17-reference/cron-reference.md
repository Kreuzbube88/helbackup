# Cron Reference

## Format

```
┌───────────── Minute (0-59)
│ ┌───────────── Hour (0-23)
│ │ ┌───────────── Day of month (1-31)
│ │ │ ┌───────────── Month (1-12)
│ │ │ │ ┌───────────── Weekday (0=Sun, 6=Sat)
│ │ │ │ │
* * * * *
```

## Special Expressions

| Expression | Equivalent | Meaning |
|------------|-----------|---------|
| `@yearly` / `@annually` | `0 0 1 1 *` | Yearly, January 1st |
| `@monthly` | `0 0 1 * *` | Monthly, 1st of month |
| `@weekly` | `0 0 * * 0` | Weekly, Sunday |
| `@daily` / `@midnight` | `0 0 * * *` | Daily at midnight |
| `@hourly` | `0 * * * *` | Every hour |

## Special Characters

| Character | Meaning | Example |
|-----------|---------|---------|
| `*` | Any value | `* * * * *` = every minute |
| `,` | List | `1,15 * * * *` = minute 1 and 15 |
| `-` | Range | `1-5 * * * *` = minute 1 to 5 |
| `/` | Step | `*/5 * * * *` = every 5 minutes |

## Common Expressions

| Cron | Schedule |
|------|---------|
| `0 2 * * *` | Daily at 02:00 |
| `0 2 * * 0` | Sundays at 02:00 |
| `0 2 1 * *` | Monthly, 1st at 02:00 |
| `0 */6 * * *` | Every 6 hours |
| `30 1 * * 1-5` | Mon-Fri at 01:30 |
| `0 2 * * 1,4` | Mon and Thu at 02:00 |

---
Back: [Reference Overview](overview.md)
