# Prometheus Metrics

## Endpoint

```
http://YOUR-UNRAID-IP:3000/metrics
```

No auth required (Prometheus standard).

## Available Metrics

### Backup Metrics

```
# Total backups by status
helbackup_backups_total{status="success"} 145
helbackup_backups_total{status="failed"} 3
helbackup_backups_total{status="warning"} 7

# Last backup duration (seconds)
helbackup_backup_duration_seconds{job="Daily Flash Backup"} 35

# Backup size (bytes)
helbackup_backup_size_bytes{job="Daily Flash Backup"} 12582912

# Last backup timestamp (Unix)
helbackup_last_backup_timestamp{job="Daily Flash Backup"} 1705276800
```

### System Metrics

```
# Storage usage per target (bytes)
helbackup_storage_used_bytes{target="Local Backups"} 48550000000

# Active jobs
helbackup_jobs_active 5

# Currently running backups
helbackup_running_jobs 0
```

## Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'helbackup'
    static_configs:
      - targets: ['192.168.1.100:3000']
    metrics_path: '/metrics'
    scrape_interval: 60s
```

## Grafana Dashboard

Import Dashboard ID: **HELBACKUP-001** (available after release)

Panels:
- Backup Success Rate (24h)
- Backup Duration (time series)
- Storage Trend
- Failed Backups Alert
- Job Status Table

## Alerting Rules

```yaml
# alert-rules.yml
groups:
  - name: helbackup
    rules:
      - alert: BackupFailed
        expr: increase(helbackup_backups_total{status="failed"}[24h]) > 0
        severity: critical
        annotations:
          summary: "HELBACKUP: Backup failed in last 24h"

      - alert: NoRecentBackup
        expr: time() - helbackup_last_backup_timestamp > 86400
        severity: warning
        annotations:
          summary: "HELBACKUP: No backup in last 24h"
```

---
Back: [API Overview](../09-api/overview.md)
