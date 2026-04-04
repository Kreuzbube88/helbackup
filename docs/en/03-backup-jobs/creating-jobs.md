# Creating Backup Jobs

## What is a Backup Job?

A Job defines:
- **What** gets backed up (Backup Types)
- **When** it runs (Schedule/Cron)
- **Where** it's stored (Target)
- **How** it runs (Encryption, Hooks, etc.)

## Create a Job

1. **Navigate:** Jobs → "New Job"
2. Fill in fields:

```
Name: Daily Full Backup
Target: Local Backups
Schedule: 0 2 * * *  (daily at 02:00)
Enabled: ✅
```

3. Select Backup Types:
```
✅ Flash Drive
✅ Appdata
☐ VMs
☐ Docker Images
```

4. Click "Save"

## Run Job Immediately

Jobs page → Job → "Run Now"

## Job Status

| Status | Meaning |
|--------|---------|
| Success | Backup completed |
| Failed | Error (check Logs) |
| Running | Currently active |
| Disabled | Disabled |
| Scheduled | Waiting for schedule |

---
Next: [Scheduling (Cron)](scheduling.md) | [All Backup Types](backup-types.md)
