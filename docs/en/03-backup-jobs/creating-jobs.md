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

## Dry-Run Mode

A job can be executed in **Dry-Run Mode** for testing purposes. rsync simulates the transfer without writing any files — all other logic steps (stopping containers, resolving paths, writing logs) run normally.

**What happens in dry-run:**
- rsync runs with `--dry-run` — no files are written
- NAS transfer, finalize, and manifest entry are skipped
- No webhook notifications are sent
- VM and Docker image steps are skipped entirely
- The run appears in job history (for auditability)

**Usage:** Dry-run can be triggered via the API (`POST /api/jobs/:id/trigger` with `{"dryRun": true}`) or directly via the "Run Now" button in the UI.

Useful for checking which files rsync would transfer without consuming storage space or opening NAS connections.

## Per-Step Bandwidth Limit

Each backup step can have an individual **bandwidth limit** configured. The value is passed directly to rsync as `--bwlimit`.

```
Bandwidth Limit: 50000  (KB/s — 0 = no limit)
```

The step-level limit takes precedence over the global limit under **Settings → Backup → Rsync Bandwidth Limit**. If no step limit is set, the global limit applies (default: 0 = unlimited).

Useful for throttling backups to NAS targets to avoid saturating the network.

---
Next: [Scheduling (Cron)](scheduling.md) | [All Backup Types](backup-types.md)
