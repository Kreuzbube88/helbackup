# Backup Verification

## Why Verify?

- Silent file corruption (bit rot)
- Network errors during backup
- Failing disks
- Backup "exists" but is corrupted

## Verification Types

### Quick Verify
- Checks: File existence, size, timestamp
- Duration: Seconds
- Detects: Missing files, obvious corruption

### Full Verify
- Checks: SHA-256 checksums of all files
- Duration: Minutes to hours (depends on backup size)
- Detects: Silent file corruption, bit rot

## Run Verification

1. **Navigate:** Recovery → Select backup
2. Click "Verify"
3. Select Quick or Full
4. Wait for result

## Automatic Verification

In job configuration:
```
Verify after backup: ✅ Quick (recommended)
Full verify schedule: 0 4 * * 0 (weekly Sunday 04:00)
```

Details: [Automated Verification](automated-verification.md)

## Verification Results

**Success:**
```
✅ Verification successful!
Checked: 2,847 files
Size: 23.4 GB
Duration: 4m 32s
SHA-256: All files match
```

**Failed:**
```
❌ Verification failed!
Corrupted files: 3
  - appdata/plex/Library/database.db (SHA-256 mismatch)
  - appdata/nextcloud/config/config.php (missing)
Action required: Re-run backup
```

---
Next: [Automated Verification](automated-verification.md)
