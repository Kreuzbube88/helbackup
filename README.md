<p align="center">
  <img src="frontend/public/logo.png" alt="HELBACKUP" width="450" height="450"/>
</p>

<p align="center">
  <strong>Intelligent Backup Orchestrator for Unraid</strong>
</p>

<p align="center">
  <a href="README.de.md">🇩🇪 Deutsch</a> &nbsp;|&nbsp; 🇬🇧 English
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen" alt="Node.js">
  <img src="https://img.shields.io/github/license/Kreuzbube88/helbackup" alt="License">
  <img src="https://img.shields.io/badge/platform-Unraid-orange" alt="Platform">
</p>

---

HELBACKUP is a self-hosted backup solution built specifically for [Unraid](https://unraid.net). It runs as a single Docker container and gives you full control over what gets backed up, when, and where — with a clean web interface, no cloud dependency, and no subscription.

---

## Features

- **Automated Backup Jobs** — Flash Drive, Appdata, VMs, Docker Images, System Config
- **Multiple Target Types** — Local filesystem, remote server or NAS via SSH+Rsync
- **AES-256 Encryption** — Optional end-to-end encryption with recovery key
- **GFS Retention** — Grandfather-Father-Son rotation saves up to 90% storage
- **Disaster Recovery** — Granular file restore and full server restore wizard
- **Onboarding Wizard** — Get your first backup running in minutes with the guided setup
- **7 Notification Channels** — Email, Gotify, ntfy, Pushover, Telegram, Discord, Slack
- **REST API & Webhooks** — Token-based API, HMAC-signed webhook events
- **Prometheus Metrics** — Ready-made monitoring integration
- **Dark UI** — React 18 web interface, available in German and English

---

## Installation

### Unraid Community Apps (recommended)

1. Open the **Apps** tab in Unraid
2. Search for **HELBACKUP**
3. Click **Install** and follow the template

HELBACKUP will be available at `http://YOUR-UNRAID-IP:3000`.

### Docker Compose

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
      - JWT_SECRET=your_secret_here   # openssl rand -hex 32
      - SECURE_COOKIES=false          # true when using HTTPS via reverse proxy
      - TZ=Europe/Berlin
      - LOG_LEVEL=info
      - PUID=99
      - PGID=100
      - LIBVIRT_DEFAULT_URI=qemu:///system
    volumes:
      - /mnt/user/appdata/helbackup/config:/app/config
      - /mnt/user/appdata/helbackup/data:/app/data
      - /mnt/user/appdata/helbackup/logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
      - /boot:/unraid/boot                          # rw — required for Flash backup/restore
      - /mnt/user:/unraid/user                      # rw — required for Appdata/VM backup/restore
      # Optional — required for VM backups:
      # - /mnt/cache:/mnt/cache:ro
      # - /etc/libvirt:/unraid/libvirt:ro
      # - /var/run/libvirt/libvirt-sock:/var/run/libvirt/libvirt-sock
```

---

## Quick Start

After installation, open the web UI and follow the **onboarding wizard** — it walks you through creating your first backup target and job in under 5 minutes. You can also launch it anytime via the **Quick Start Guide** button on the Dashboard.

---

## Documentation

Full documentation is available in the [`docs/`](docs/README.md) folder in both German and English, covering installation, backup types, targets, encryption, recovery, API, and more.

For a technical deep-dive into the architecture, data flow, and security model, see [docs/architecture.md](docs/architecture.md).

---

## Requirements

- **Docker socket** `/var/run/docker.sock` — required for container stop/start during backups
- **Host mounts** `/boot` and `/mnt/user` — required for Flash Drive and Appdata/VM restore
- **Network access** — required for remote targets (SSH/Rsync), Wake-on-LAN
- **VM backups (optional):** Libvirt socket `/var/run/libvirt/libvirt-sock` and config mount `/etc/libvirt` — required for VM stop/start and XML export
- Community Apps plugin (only required for store installation)

---

## Verified Restore

> **A backup is not a backup until you have restored from it.**

Creating backup jobs is only the first step. Before you need it in an emergency,
test the full recovery path:

1. Run a backup job and let it complete
2. Go to **Recovery** and run **Verify Backup** — confirms checksums match
3. At least once, follow [Disaster Recovery — Day Zero](docs/en/05-recovery/disaster-recovery-day-zero.md)
   end-to-end on a test machine or in a VM

**3-2-1 rule:** Keep **3** copies of your data, on **2** different media types,
with **1** copy offsite (or at minimum on a separate NAS from your primary array).

HELBACKUP supports this pattern with multiple targets per job — assign a local
target and an off-site SSH/Rsync target to the same job.

---

## License

MIT © HEL*Apps
