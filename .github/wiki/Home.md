# HELBACKUP

Intelligent backup orchestrator for Unraid. Self-hosted, single Docker container.

## What is HELBACKUP?

HELBACKUP manages scheduled backups of your Unraid server — Flash Drive, Appdata, VMs, Docker Images, System Config and databases — to local or remote targets (NAS via SSH+Rsync). It runs entirely in a single Docker container, requires no privileged mode, and includes a built-in recovery interface.

## Key Features

- **Multiple backup types** — Flash, Appdata (per container), VMs, Docker Images, System Config, Database Dumps
- **Multi-target** — Remote NAS (SSH + Rsync) and local filesystem
- **Encryption** — AES-256 GPG encryption per job
- **Scheduling** — Cron-based, with catch-up on restart
- **Recovery** — Granular restore, Full Server Restore wizard, Recovery Mode
- **Notifications** — Email, Gotify, Webhooks
- **Monitoring** — Prometheus metrics endpoint
- **Verification** — SHA-256 checksum verification after transfer

## Quick Links

| | |
|---|---|
| 🚀 [Installation](getting-started-installation) | Get up and running |
| 📋 [Prerequisites](getting-started-prerequisites) | What you need before starting |
| 💼 [Creating Jobs](backup-jobs-creating-jobs) | Set up your first backup job |
| 🔄 [Recovery](recovery-overview) | Restore from a backup |
| 🔍 [Troubleshooting](troubleshooting-common-issues) | Common issues and fixes |

## Required Mounts

> ⚠️ All mounts must be **read-write (rw)**. Read-only mounts will prevent backups and restores.

```yaml
volumes:
  - /mnt/cache:/unraid/cache:rw       # Appdata (required)
  - /mnt/user:/unraid/user:rw         # Array shares
  - /boot:/unraid/boot:rw             # Flash Drive
  - /var/run/docker.sock:/var/run/docker.sock
  # Optional — VM backups only:
  # - /etc/libvirt:/unraid/libvirt:rw
```

---
*Built for Unraid · [GitHub](https://github.com/Kreuzbube88/helbackup)*
