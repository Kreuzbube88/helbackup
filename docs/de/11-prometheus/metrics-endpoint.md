# Prometheus Metrics

## Endpoint

```
http://YOUR-UNRAID-IP:3000/metrics
```

Kein Auth required (Prometheus-Standard).

## Verfügbare Metriken

### Backup Metriken

```
# Gesamtanzahl Backups
helbackup_backups_total{status="success"} 145
helbackup_backups_total{status="failed"} 3
helbackup_backups_total{status="warning"} 7

# Letzte Backup-Dauer (Sekunden)
helbackup_backup_duration_seconds{job="Daily Flash Backup"} 35

# Backup-Größe (Bytes)
helbackup_backup_size_bytes{job="Daily Flash Backup"} 12582912

# Letzter Backup-Timestamp (Unix)
helbackup_last_backup_timestamp{job="Daily Flash Backup"} 1705276800
```

### System Metriken

```
# Speicherverbrauch pro Target (Bytes)
helbackup_storage_used_bytes{target="Local Backups"} 48550000000

# Aktive Jobs
helbackup_jobs_active 5

# Laufende Backups
helbackup_running_jobs 0
```

## Prometheus Konfiguration

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

Import Dashboard ID: **HELBACKUP-001** (nach Release verfügbar)

Panels:
- Backup Success Rate (24h)
- Backup Duration (Zeitreihe)
- Storage Trend
- Failed Backups Alert
- Job Status Tabelle

## Alerting

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
Zurück: [API Overview](../09-api/overview.md)
