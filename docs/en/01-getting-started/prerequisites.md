# Prerequisites

Before installing HELBACKUP, verify that your environment meets these requirements.
Taking 10 minutes here saves hours of troubleshooting later.

---

## Unraid Version

**Minimum: Unraid 6.12**

Older versions may lack the kernel features needed for the Docker socket mounts.
Check: Unraid UI → top-right corner shows the version string.

---

## Time Synchronization (NTP)

Cron schedules, backup timestamps, and log correlation all depend on correct
system time. Unraid ships with NTP enabled by default, but verify it:

**Unraid UI → Settings → Date and Time** — confirm NTP server is set and time
is correct.

If the container clock drifts more than a few seconds from the NAS, SSH
connections may be refused with a "clock skew too great" error.

---

## Network

- HELBACKUP runs on port **3000** by default — ensure nothing else uses that port
- The Unraid host needs to reach your NAS over the network (ping test is sufficient)
- If using Wake-on-LAN: the NAS must be on the same broadcast domain (subnet) as
  the Unraid host, or you must have a directed broadcast route

---

## Disk Space Estimate

A rough sizing guide before you configure your first job:

| Backup type | Typical size | Notes |
|-------------|-------------|-------|
| Flash Drive | 1–5 GB | Full `/boot` — only changes each Unraid update |
| Appdata | 1 GB – 1 TB | Depends entirely on your containers |
| VMs | 10 GB – 4 TB | Size of vDisk images |
| Docker Images | 500 MB – 50 GB | Per pulled image |
| System Config | < 1 MB | JSON export only |
| HELBACKUP Self | 1–20 MB | Database + SSH keys |

**Free space on target:** Plan for at least 3× the current source size to
accommodate GFS retention (daily + weekly + monthly copies).

---

## SSH Key Setup (for NAS targets)

If you plan to back up to a remote NAS via SSH+Rsync, generate a dedicated
key pair **before** adding the target in HELBACKUP:

```bash
# On the Unraid host (or any machine with ssh-keygen):
ssh-keygen -t ed25519 -C "helbackup@unraid" -f ~/.ssh/helbackup_id_ed25519
```

Press Enter twice for no passphrase (HELBACKUP manages keys without interactive
passphrase input).

Set permissions — this is required, HELBACKUP will refuse keys with looser permissions:

```bash
chmod 600 ~/.ssh/helbackup_id_ed25519
chmod 644 ~/.ssh/helbackup_id_ed25519.pub
```

Copy the public key to the NAS:

```bash
ssh-copy-id -i ~/.ssh/helbackup_id_ed25519.pub user@your-nas-ip
```

Or paste the contents of `helbackup_id_ed25519.pub` into the NAS's
**SSH Authorized Keys** field (Synology: Control Panel → Terminal & SNMP →
SSH, then edit `~/.ssh/authorized_keys` for the backup user).

When adding the target in HELBACKUP, paste the **private key** content
(`helbackup_id_ed25519`, not the `.pub` file).

---

## Port 3000 Available

Confirm nothing else is listening on port 3000:

```bash
# On the Unraid terminal:
ss -tlnp | grep :3000
# No output = port is free
```

If port 3000 is taken, change the host-side port in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"   # host port 3001 → container port 3000
```

---

## Sanity Check Before Install

Run these on the Unraid terminal before proceeding:

```bash
# Docker is running
docker ps

# /boot is accessible (HELBACKUP needs this for Flash backup)
ls /boot/config/plugins/ | head -5

# User share is mounted
ls /mnt/user/appdata/ | head -5

# NAS reachable (replace with your NAS IP)
ping -c 3 192.168.1.100
```

All commands should return output without errors. If `/boot` is empty or
`/mnt/user/appdata/` returns nothing, check that the Unraid array is started
(**Main** tab → Start).

---

Next: [Installation](installation.md)
