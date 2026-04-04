# Scheduling (Cron)

## Cron Format

```
* * * * *
│ │ │ │ └── Weekday (0=Sun, 1=Mon, ..., 6=Sat)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

## Common Schedules

| Cron | Meaning |
|------|---------|
| `@daily` | Daily at 00:00 |
| `@hourly` | Every hour |
| `@weekly` | Weekly (Sunday 00:00) |
| `@monthly` | Monthly (1st at 00:00) |
| `0 2 * * *` | Daily at 02:00 |
| `0 2 * * 0` | Sundays at 02:00 |
| `0 2 1 * *` | Monthly, 1st at 02:00 |
| `0 */6 * * *` | Every 6 hours |
| `30 1 * * 1-5` | Mon-Fri at 01:30 |

## Recommended Times

- **Night 01:00-04:00:** Lowest Unraid activity
- **Staggered:** Don't start jobs at the same time
- **Avoid Parity:** Don't schedule during parity check

## Avoiding Cron Conflicts

With multiple jobs:
```
Flash Backup:   0 1 * * *   (01:00)
Appdata Backup: 0 2 * * *   (02:00)
VM Backup:      0 3 * * 0   (03:00, Sunday only)
```

## Cron Validator

HELBACKUP automatically validates cron expressions and shows:
- Next 5 execution times
- Error message for invalid format

---
Back: [Creating Jobs](creating-jobs.md)
