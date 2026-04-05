# Guided Setup

HELBACKUP includes two onboarding tools to help new users get started quickly: the **Onboarding Tour** and the **First Backup Wizard**.

---

## Onboarding Tour

The onboarding tour is displayed automatically the **first time you log in** after completing the initial setup. It is a welcome modal that gives a brief overview of the three steps to get started:

1. **Create a Target** — define where your backups are stored (local disk, NAS, or cloud)
2. **Create a Backup Job** — specify what to back up and on what schedule
3. **Run your first backup** — execute immediately or wait for the scheduled run

### Options

| Button | Effect |
|--------|--------|
| **Start Guide** | Closes the tour and opens the First Backup Wizard |
| **Skip** | Closes the tour and marks onboarding as done |

Onboarding completion is stored in browser `localStorage` (`helbackup_onboarding_done`). Once skipped or completed it will not appear again unless the browser storage is cleared.

---

## First Backup Wizard

The wizard guides you through creating a backup target and a backup job in a single flow. It is accessible from the **"Quick Start Guide"** button on the following pages:

- Dashboard
- Jobs
- Targets
- Recovery

### Steps

| Step | What happens |
|------|--------------|
| **1 — Target** | Choose target type (Local, NAS, Rclone) and enter connection details |
| **2 — Backup Types** | Select what to back up: Flash Drive, Appdata, VMs, Docker Images, System Config |
| **3 — Schedule & Name** | Name the job and set a cron schedule |
| **4 — Review** | Confirm all settings before saving |
| **5 — Done** | Target and job are created; you can run the job immediately |

### Target types

- **Local** — path on the Unraid array (e.g. `/mnt/user/backups`)
- **NAS** — SSH+Rsync to a Synology or QNAP NAS; supports Wake-on-LAN and auto-shutdown
- **Rclone** — any of 40+ cloud providers via a pre-configured Rclone remote

### Closing the wizard

If you close the wizard mid-way, a confirmation prompt is shown. No target or job is created until Step 5 is completed.

---

Next: [Concepts](concepts.md)
