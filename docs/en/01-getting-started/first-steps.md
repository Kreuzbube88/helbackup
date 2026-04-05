# First Steps

> **Quick Start Wizard available:** Instead of following these manual steps, you can use the built-in First Backup Wizard. Click the **"Quick Start Guide"** button on the Dashboard, Jobs, Targets, or Recovery page to launch it. See [Guided Setup](guided-setup.md) for details.

In 15 minutes you'll have:
- First Backup Target configured
- First Backup Job created
- Test backup completed
- Notifications set up

## Step 1: Create Backup Target

1. **Navigate:** Settings → Targets → "New Target"
2. **Configure:**

```
Name: Local Backups
Type: Local
Path: /mnt/user/backups/helbackup
Encrypted: ☐ (off for now)
Retention: Simple
Retention Days: 30
```

3. Click "Save"

## Step 2: Create First Backup Job

1. **Navigate:** Jobs → "New Job"
2. **Configure:**

```
Name: Daily Flash Backup
Target: Local Backups
Schedule: @daily
Backup Types: ✅ Flash Drive
```

3. Click "Save"

## Step 3: Test Backup

1. Jobs page → "Daily Flash Backup" → "Run Now"
2. Monitor progress in Dashboard or Logs

## Step 4: Verify Backup

1. **Navigate:** Recovery
2. Find your backup in the list
3. Click "Verify" → "Verification successful!"

## Step 5: Test Restore (CRITICAL)

> A backup is worthless if restore doesn't work!

1. Backup → Click "Restore"
2. Dry Run: **enabled** (simulation only!)
3. Restore to: `/tmp/test-restore`
4. Click "Start Restore"

## Step 6: Notifications

1. **Navigate:** Settings → Notifications
2. Choose channel (Email, Gotify, ntfy, etc.)
3. Enable events: `backup_success`, `backup_failed`
4. Click "Test"
5. Click "Save"

---
Next: [Concepts](concepts.md)
