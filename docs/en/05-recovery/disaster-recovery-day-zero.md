# Disaster Recovery — Day Zero

This guide covers the scenario where **everything is gone**: the Unraid server is
unrecoverable, the HELBACKUP container is destroyed, and you are starting from
scratch on new (or freshly reinstalled) hardware.

**Assumption:** Your backups exist on a NAS or a local drive that survived the disaster.

---

## Prerequisites

Before you start, make sure you have:

- [ ] A running Unraid installation (can be brand-new)
- [ ] Access to the NAS / external drive that holds your backups
- [ ] The HELBACKUP self-backup file (a `.tar.gz` or `.tar.gz.gpg` inside the
      `helbackup/YYYY-MM-DD/` directory on your backup target)
- [ ] Your encryption recovery key (if backups are encrypted) — format:
      `HLBK-ENC-XXXX-XXXX-XXXX-XXXX`

> **No self-backup?**
> If you never created a self-backup job (see [Self-Backup Guide](self-backup.md)),
> HELBACKUP can still import backup manifests by scanning your target directories.
> Jump to [Step 3b — Scan for Backups](#step-3b--scan-for-backups-no-self-backup).

---

## Step 1 — Spin Up a Fresh HELBACKUP Container

Create a `.env` file with a new JWT_SECRET:

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" > /mnt/user/appdata/helbackup/.env
```

Create `docker-compose.yml` in `/mnt/user/appdata/helbackup/`:

```yaml
services:
  helbackup:
    image: ghcr.io/kreuzbube88/helbackup:latest
    container_name: helbackup
    restart: unless-stopped
    privileged: false
    ports:
      - "3000:3000"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - TZ=Europe/Berlin
      - LOG_LEVEL=info
    volumes:
      - /mnt/user/appdata/helbackup/config:/app/config
      - /mnt/user/appdata/helbackup/data:/app/data
      - /mnt/user/appdata/helbackup/logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
      - /boot:/unraid/boot
      - /mnt/user:/unraid/user
      # Mount your backup target for recovery access:
      - /mnt/user/backups:/mnt/recovery-target   # adjust path to your backup location
```

Start the container:

```bash
cd /mnt/user/appdata/helbackup
docker compose --env-file .env up -d
```

Verify it is healthy:

```bash
curl -s http://YOUR-UNRAID-IP:3000/api/health
# Expected: {"status":"healthy","database":"ok","version":"..."}
```

---

## Step 2 — Log In and Set Up a New Admin Account

Open `http://YOUR-UNRAID-IP:3000` in your browser. The onboarding wizard will
start automatically. Create a new admin password.

> **Note:** This is a brand-new database — your old jobs and targets are not visible
> yet. That is normal. You will recover them in the next step.

---

## Step 3a — Restore the HELBACKUP Self-Backup

This restores your previous HELBACKUP database (jobs, targets, history, settings)
and SSH keys.

1. Go to **Recovery** in the sidebar
2. Click **Enable Recovery Mode** (this pauses all scheduled jobs)
3. Click **Scan for Backups** and enter the path to your backup directory
   (the one mounted as `/mnt/recovery-target` or wherever your backups are)
4. HELBACKUP will find the `manifest.json` files and list all available backups
5. Find the most recent **HELBACKUP Self-Backup** entry and click **Restore**
6. Follow the wizard — it will restore the SQLite database and SSH keys
7. **Restart the container** so the restored database takes effect:

```bash
docker restart helbackup
```

8. Log in again — all your previous jobs, targets, and history should now be visible

---

## Step 3b — Scan for Backups (no self-backup)

If you have no self-backup, HELBACKUP can still discover your existing backup
manifests and let you restore individual items.

1. Go to **Recovery → Scan for Backups**
2. Enter the root path of your backup storage (e.g. `/mnt/recovery-target`)
3. HELBACKUP scans recursively (up to depth 5) for `manifest.json` files
4. All found backups are imported into the database
5. You can now restore individual items (appdata, VMs, etc.) via the recovery wizard

> You will need to recreate your backup jobs and targets manually since the
> configuration database was not recovered.

---

## Step 4 — Restore Your Data

With backups visible in the Recovery section:

### Flash Drive
```
Recovery → select Flash backup → Restore to /boot → Reboot Unraid
```
A reboot is required to apply Flash Drive changes.

### Appdata (Docker containers)
```
Recovery → select Appdata backup → choose containers → Restore
```
HELBACKUP rsyncs the appdata back to `/mnt/user/appdata/<container>`.
Recreate containers via the Docker tab afterwards (configs are in the backup).

### VMs
```
Recovery → select VM backup → Restore XML
```
Then use Unraid VM Manager to register the restored disk images.

### System Config
System config is restored to `/tmp/restore-config` for manual review.
Apply changes carefully — not all settings transfer between Unraid versions.

---

## Step 5 — Verify and Resume

1. Test one restored application before restoring everything
2. Run **Verify Backup** on your most important backups
3. Once satisfied, disable Recovery Mode: **Recovery → Disable Recovery Mode**
4. Your scheduled backup jobs will resume automatically

---

## Checklist

- [ ] Container running and `/api/health` returns `healthy`
- [ ] Self-backup restored (or manifests scanned)
- [ ] Flash Drive restored + Unraid rebooted
- [ ] Appdata restored for all critical containers
- [ ] VMs registered and bootable
- [ ] Backup jobs and targets visible and correct
- [ ] First new backup completed and verified after recovery
- [ ] Recovery Mode disabled

---

> **Tip:** After recovery, create a new self-backup immediately so you are not
> in this position again. See [Self-Backup Guide](self-backup.md).

---
Previous: [Full Server Restore](full-server-restore.md) | Next: [Self-Backup](self-backup.md)
