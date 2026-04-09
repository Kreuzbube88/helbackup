# Self-Backup Guide

HELBACKUP can back up itself — its database, configuration, and SSH keys — so
that a full recovery is possible even when the server is completely lost.

---

## Why You Need a Self-Backup

Your Unraid data is only recoverable if you can restore HELBACKUP itself first.
Without a self-backup you lose:

- All backup **job definitions** (schedules, steps, target assignments)
- All **target configurations** (NAS credentials, SSH keys, paths)
- All **backup history** (run logs, checksums, verification results)
- All application **settings**

With a self-backup, the full DR procedure takes minutes instead of hours of
manual recreation. See [Disaster Recovery — Day Zero](disaster-recovery-day-zero.md).

---

## What the Self-Backup Contains

| Item | Path inside archive | Notes |
|------|---------------------|-------|
| SQLite database | `helbackup.db` | Jobs, targets, history, settings, logs |
| SSH private keys | `ssh/` | Used by NAS targets — encrypted inside the archive |
| Application config | `config/` | JWT secret excluded (environment variable) |

The archive is a `.tar.gz` file (or `.tar.gz.gpg` when job-level encryption
is enabled). SSH private keys are always wrapped in an additional GPG layer
regardless of job encryption, so the keys are never stored in plaintext even
in an unencrypted self-backup.

> **Important:** The JWT_SECRET environment variable is **not** included in the
> self-backup. You must keep it safe separately (password manager, vault). After
> a restore the container uses whatever JWT_SECRET is in the new `.env` file —
> active browser sessions will be invalidated, but the database itself is intact.

---

## Where to Store the Self-Backup

> **Do NOT put the self-backup on the same target as your primary data backups.**

If the NAS that holds your Appdata backups is also destroyed or unreachable,
you need the self-backup to restore your target configuration — creating a
circular dependency you cannot break.

**Recommended placement:**

| Option | Example path | Why |
|--------|-------------|-----|
| Second NAS target | Separate SSH+Rsync target on a different host | Best isolation |
| Local filesystem on a USB drive | `/mnt/disks/usb-stick/helbackup-self/` | Simple, offline copy |
| Same NAS, different share | Only if no second target is available — at least a different share path | Partial isolation |

The self-backup file is small (typically 1–20 MB). Retention of 7 daily + 4
weekly copies (GFS) is more than sufficient.

---

## Creating a Self-Backup Job

1. Go to **Jobs → New Job**
2. Add a step of type **HELBACKUP Self-Backup**
3. Assign it to a target that is **different** from your primary Appdata target
4. Set a schedule — daily at 03:00 is a good default:
   ```
   0 3 * * *
   ```
5. Optionally enable **encryption** — use a strong passphrase and store the
   recovery key (`HLBK-ENC-XXXX-XXXX-XXXX-XXXX`) in a password manager
6. Save and run once manually to confirm it works

The resulting backup directory will contain:

```
<target-path>/helbackup/YYYY-MM-DD/
  manifest.json
  helbackup-self-YYYY-MM-DDTHH-mm-ss.tar.gz          # unencrypted
  helbackup-self-YYYY-MM-DDTHH-mm-ss.tar.gz.gpg       # encrypted variant
```

---

## Restoring from a Self-Backup

See [Disaster Recovery — Day Zero → Step 3a](disaster-recovery-day-zero.md#schritt-3a--helbackup-selbstsicherung-wiederherstellen)
for the full procedure. Summary:

1. Spin up a fresh HELBACKUP container (empty `/app/data`)
2. Mount the drive/NAS that holds the self-backup as a volume
3. **Recovery → Scan for Backups** → enter the mount path
4. Select the most recent **HELBACKUP Self-Backup** entry → **Restore**
5. `docker restart helbackup`
6. Log in — all jobs, targets, and history are back

---

## Recovery Key

If the self-backup job has encryption enabled, HELBACKUP generates a recovery
key during job creation:

```
HLBK-ENC-XXXX-XXXX-XXXX-XXXX
```

**Store this key separately from the backup itself.** Suggested locations:

- Password manager (Bitwarden, 1Password, KeePass)
- Printed copy in a safe
- Separate cloud note (not in the same account as your Unraid login)

Without the recovery key, an encrypted self-backup **cannot be decrypted**. There
is no backdoor.

---

## Checklist

- [ ] A self-backup job exists and is enabled
- [ ] The target for self-backup is **different** from primary Appdata target
- [ ] Recovery key is stored in a password manager / offline location
- [ ] The job has run at least once successfully (green in History)
- [ ] You have verified the restore at least once (see Day Zero guide)

---

Previous: [Full Server Restore](full-server-restore.md) | Next: [Disaster Recovery — Day Zero](disaster-recovery-day-zero.md)
