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
  <img src="https://img.shields.io/badge/status-in%20development-yellow" alt="Status">
  <img src="https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen" alt="Node.js">
  <img src="https://img.shields.io/github/license/Kreuzbube88/helbackup" alt="License">
  <img src="https://img.shields.io/badge/platform-Unraid-orange" alt="Platform">
</p>

---

HELBACKUP is a self-hosted backup solution built specifically for [Unraid](https://unraid.net). It runs as a single Docker container and gives you full control over what gets backed up, when, and where — with a clean web interface, no cloud dependency, and no subscription.

---

## Features

- **Automated Backup Jobs** — Flash Drive, Appdata, VMs, Docker Images, System Config
- **Multiple Target Types** — Local filesystem, NAS via SSH+Rsync, 40+ cloud providers via Rclone
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
    privileged: true
    ports:
      - "3000:3000"
    volumes:
      - /mnt/user/appdata/helbackup/data:/app/data
      - /mnt/user/appdata/helbackup/config:/app/config
      - /mnt/user/appdata/helbackup/logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
      - /boot:/unraid/boot:ro
      - /mnt/user:/unraid/user:ro
```

> **Note:** Privileged mode is required to access the Unraid Flash Drive (`/boot`) and user array.

---

## Quick Start

After installation, open the web UI and follow the **onboarding wizard** — it walks you through creating your first backup target and job in under 5 minutes. You can also launch it anytime via the **Quick Start Guide** button on the Dashboard.

For full documentation see [docs/](docs/README.md).

---

## Documentation

Full documentation is available in the [`docs/`](docs/README.md) folder in both German and English, covering installation, backup types, targets, encryption, recovery, API, and more.

---

## Requirements

- Unraid 6.9 or newer
- Community Apps plugin (for store installation)
- ~500 MB disk space for the container
- Docker socket access

---

## License

MIT © 2024 HEL*Apps
