# Changelog

## v1.0.0 (2024-01-15)

### Features
- Flash Drive, Appdata, VM, Docker Image, Database Backups
- Local, NAS (SSH+Rsync), Cloud (Rclone) Targets
- AES-256 Encryption with Recovery Key
- GFS Retention
- Granular Restore + Full Server Restore Wizard
- 7 Notification Channels (Email, Gotify, ntfy, Pushover, Telegram, Discord, Slack)
- Public REST API with Token Authentication
- Webhooks with HMAC signing
- Prometheus Metrics
- React 18 WebUI with dark mode
- i18n: German + English

### Technical
- Node.js 24, TypeScript strict
- Fastify 4, React 18, Vite 5
- SQLite (WAL mode), better-sqlite3
- Docker: ghcr.io/kreuzbube88/helbackup
