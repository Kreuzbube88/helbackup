# Backup Strategy

## The 3-2-1 Rule

The proven backup strategy:

```
3 copies of data
2 different storage media
1 copy off-site
```

**Example setup:**
```
Original:   Unraid Array           (1st copy)
Local:      Separate USB/HDD       (2nd copy, different media)
Off-site:   Backblaze B2 Cloud     (3rd copy, off-site)
```

## Recommended Job Structure

```
Job 1: Flash Backup
  Schedule: daily 01:00
  Target: Local + Cloud
  Types: Flash Drive

Job 2: Appdata Backup
  Schedule: daily 02:00
  Target: NAS + Cloud
  Types: Appdata, Databases

Job 3: VM Backup
  Schedule: weekly Sunday 03:00
  Target: NAS
  Types: VMs, Docker Images
```

## Test Restores

**Monthly:**
- [ ] Pick a random backup
- [ ] Run Quick Verify
- [ ] Test granular restore of one file
- [ ] Verify result is correct

**Annually:**
- [ ] Full Server Restore Dry Run
- [ ] Walk through Disaster Recovery plan

> **A backup without a tested restore is not a backup!**

## Retention Recommendations

| Data | Retention |
|------|-----------|
| Flash Drive | GFS: 7/4/12/3 |
| Appdata | GFS: 7/4/12/1 |
| VMs | Simple: 90 days |
| Databases | GFS: 30/4/6/1 |
| Docker Images | Simple: 30 days |

## Monitoring

Minimum to monitor:
- `backup_failed` → immediate notification
- `disk_space_low` → before backups start failing

---
Next: [Security Best Practices](security.md)
