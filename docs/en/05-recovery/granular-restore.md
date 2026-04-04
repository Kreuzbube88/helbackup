# Granular Restore

Restore individual files or directories from a backup.

## When to Use?

- Accidentally deleted file
- Overwritten configuration
- Restore specific container config
- Individual database

## Process

1. **Navigate:** Recovery
2. Select backup from list
3. Click "Browse Files"
4. Navigate file browser
5. Check files/folders to restore
6. Specify restore destination:

```
Restore To: /mnt/user/appdata/nextcloud/config/
Overwrite existing: ✅
Dry Run: ✅ (first!)
```

7. Click "Start Restore"

## Dry Run

Always run Dry Run first:
```
Dry Run: ✅ enabled
→ Shows what would be restored
→ No actual changes

Dry Run: ☐ disabled
→ Real restore
```

## Restore from Encrypted Backups

For encrypted targets:
```
Recovery Key: [Enter key]
→ Automatic decryption
```

---
Back: [Recovery Overview](overview.md)
