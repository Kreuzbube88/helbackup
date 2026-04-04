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

## Restore History

All restores are logged:
- Navigate: Recovery → History
- Shows: Date, type, result, duration

---
Next: [Granular Restore](granular-restore.md) | [Full Server Restore](full-server-restore.md)
