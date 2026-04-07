# Recovery — Overview

## Recovery Options

| Option | When | Scope |
|--------|------|-------|
| Granular Restore | Individual files/folders | Selective |
| Full Job Restore | Complete backup | One job |
| Full Server Restore | Disaster recovery | Everything |

## Granular Restore

Restore individual files or directories.

1. **Navigate:** Recovery → Select backup
2. Open file browser
3. Select files/folders
4. Specify restore path
5. "Start Restore"

**Always use Dry Run first!**

Details: [Granular Restore](granular-restore.md)

## Full Server Restore

Complete server recovery after total failure.

Wizard steps:
1. Configure target server
2. Select backup
3. Review restore order
4. Pre-flight check
5. Execute restore

Details: [Full Server Restore](full-server-restore.md)

## Restore Options

```
Overwrite existing: ✅/☐
Dry Run: ✅ (recommended for testing!)
Verify after restore: ✅
```

## Backup List & Scan

Backup cards show **job name**, date, and backup type as a badge. Older backups without checksums show an info note instead of an error.

If no backups appear in the list (e.g. after database loss):
1. Click the "Scan for Backups" button
2. HELBACKUP scans `/app/data` for existing manifests
3. Found backups are imported and appear in the list

## Restore Wizard

- The container step is automatically skipped if the backup contains no containers
- The restore destination path is pre-filled based on the backup type

## Restore History

All restores are logged:
- Navigate: Recovery → History
- Shows: Date, type, result, duration

---
Next: [Granular Restore](granular-restore.md) | [Full Server Restore](full-server-restore.md)
