# HELBACKUP Documentation

> Complete backup automation for Unraid servers

**Version:** 1.0.0  
**Languages:** [Deutsch](de/) | [English](en/)

## Quick Links

### Getting Started
- [Installation DE](de/01-getting-started/installation.md) | [EN](en/01-getting-started/installation.md)
- [First Steps DE](de/01-getting-started/first-steps.md) | [EN](en/01-getting-started/first-steps.md)
- [Concepts DE](de/01-getting-started/concepts.md) | [EN](en/01-getting-started/concepts.md)

### Core Documentation
- [Backup Targets DE](de/02-backup-targets/overview.md) | [EN](en/02-backup-targets/overview.md)
- [Backup Jobs DE](de/03-backup-jobs/creating-jobs.md) | [EN](en/03-backup-jobs/creating-jobs.md)
- [Encryption DE](de/04-encryption/aes256-setup.md) | [EN](en/04-encryption/aes256-setup.md)
- [Recovery DE](de/05-recovery/overview.md) | [EN](en/05-recovery/overview.md)
- [API Documentation DE](de/09-api/overview.md) | [EN](en/09-api/overview.md)

### Advanced
- [Webhooks DE](de/10-webhooks/overview.md) | [EN](en/10-webhooks/overview.md)
- [Prometheus Metrics DE](de/11-prometheus/metrics-endpoint.md) | [EN](en/11-prometheus/metrics-endpoint.md)
- [Troubleshooting DE](de/15-troubleshooting/common-issues.md) | [EN](en/15-troubleshooting/common-issues.md)

## Features

- **Automated Backups** — Flash, Appdata, VMs, Docker Images, Databases
- **40+ Backup Targets** — Local, NAS, Cloud (via Rclone)
- **AES-256 Encryption** — Optional end-to-end encryption
- **GFS Retention** — 80-90% storage savings
- **Disaster Recovery** — Full server restore wizard
- **7 Notification Channels** — Email, Gotify, ntfy, Pushover, Telegram, Discord, Slack
- **Public API** — Token-based authentication, rate limiting
- **Webhooks** — Event-driven integrations
- **Prometheus Metrics** — Monitoring & alerting

## Documentation Sections

| Section | DE | EN | Topic |
|---------|----|----|-------|
| 01 | [Getting Started](de/01-getting-started/) | [Getting Started](en/01-getting-started/) | Installation, first steps, concepts |
| 02 | [Backup Targets](de/02-backup-targets/) | [Backup Targets](en/02-backup-targets/) | Local, NAS, Cloud, GFS retention |
| 03 | [Backup Jobs](de/03-backup-jobs/) | [Backup Jobs](en/03-backup-jobs/) | Creating, scheduling, backup types |
| 04 | [Encryption](de/04-encryption/) | [Encryption](en/04-encryption/) | AES-256, recovery key management |
| 05 | [Recovery](de/05-recovery/) | [Recovery](en/05-recovery/) | Granular, full server restore |
| 06 | [Verification](de/06-verification/) | [Verification](en/06-verification/) | SHA-256 checksums, quick/full verify |
| 07 | [Notifications](de/07-notifications/) | [Notifications](en/07-notifications/) | All 7 channels configured |
| 08 | [Dashboard](de/08-dashboard/) | [Dashboard](en/08-dashboard/) | Health, metrics, warnings |
| 09 | [API](de/09-api/) | [API](en/09-api/) | Auth, endpoints, examples |
| 10 | [Webhooks](de/10-webhooks/) | [Webhooks](en/10-webhooks/) | Events, payload, HMAC signing |
| 11 | [Prometheus](de/11-prometheus/) | [Prometheus](en/11-prometheus/) | Metrics, Grafana dashboards |
| 12 | [Integrations](de/12-integrations/) | [Integrations](en/12-integrations/) | HELDASH, Home Assistant |
| 13 | [Advanced](de/13-advanced/) | [Advanced](en/13-advanced/) | GFS deep dive, performance tuning |
| 14 | [Security](de/14-security/) | [Security](en/14-security/) | Sessions, API security, encryption |
| 15 | [Troubleshooting](de/15-troubleshooting/) | [Troubleshooting](en/15-troubleshooting/) | Common issues, error messages |
| 16 | [Best Practices](de/16-best-practices/) | [Best Practices](en/16-best-practices/) | 3-2-1 rule, testing restores |
| 17 | [Reference](de/17-reference/) | [Reference](en/17-reference/) | Config, env vars, DB schema |
| — | [FAQ](de/18-faq.md) | [FAQ](en/18-faq.md) | Frequently asked questions |
| — | [Glossary](de/19-glossary.md) | [Glossary](en/19-glossary.md) | Terms and definitions |

## Support

- **GitHub Issues:** [Report bugs & feature requests](https://github.com/Kreuzbube88/helbackup/issues)
- **Unraid Forums:** Community support
- **Documentation:** You're reading it!
