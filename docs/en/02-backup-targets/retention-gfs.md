# GFS Retention (Grandfather-Father-Son)

## What is GFS?

GFS is a backup rotation strategy combining multiple retention periods:

- **Son (daily):** Last 7 days
- **Father (weekly):** Last 4 weeks (Saturday)
- **Grandfather (monthly):** Last 12 months (1st of month)
- **Ancestor (yearly):** Last 3 years (January 1st)

## Storage Comparison

**Scenario:** 180 days of backup data

| Strategy | Backups | Storage |
|----------|---------|---------|
| Simple (all) | 180 | 180 GB |
| GFS | ~26 | ~26 GB |
| **Savings** | **—** | **~86%** |

## Configure GFS in HELBACKUP

1. Create/edit Target
2. Retention Type: **GFS**
3. Enter values:

```
Daily Backups:    7
Weekly Backups:   4
Monthly Backups: 12
Yearly Backups:   3
```

## GFS Cleanup Preview

> **Always check Preview before running Cleanup!**

1. Target → "GFS Preview"
2. Review list: "These backups will be deleted"
3. Verify it's correct
4. Only then click "Run Cleanup"

## When to Use GFS?

**GFS recommended when:**
- Target has limited storage
- Long-term retention desired (years)
- Compliance requirements (monthly/yearly backups)

**Simple Retention when:**
- Short retention only (7-30 days)
- Storage is not a concern

---
Back: [Target Overview](overview.md)
