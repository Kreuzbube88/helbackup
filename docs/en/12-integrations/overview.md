# Integrations

## Available Integrations

### HELDASH

HELBACKUP widget for HELDASH Dashboard.

```
Widget Type: HELBACKUP
URL: http://192.168.1.100:3000
Token: helbackup_TOKEN
```

Shows: Status, recent backups, success rate

### Home Assistant

Via webhook or REST API:

```yaml
# configuration.yaml
sensor:
  - platform: rest
    resource: http://192.168.1.100:3000/api/v1/widget/status
    headers:
      Authorization: "Bearer helbackup_TOKEN"
    value_template: "{{ value_json.data.status }}"
    name: HELBACKUP Status
```

Details: [Home Assistant Setup](home-assistant.md)

### Uptime Kuma

Monitor for HELBACKUP itself:
```
Monitor Type: HTTP(s) - Keyword
URL: http://192.168.1.100:3000/api/v1/status
Keyword: "healthy"
Auth Header: Authorization: Bearer helbackup_TOKEN
```

### Grafana

Via Prometheus:
```
Data Source: Prometheus
URL: http://prometheus:9090
Dashboard: Import HELBACKUP Dashboard
```

Details: [Prometheus Setup](../11-prometheus/metrics-endpoint.md)

### n8n / Make / Zapier

Via Webhooks:
```
Trigger: HELBACKUP Webhook
Event: backup_failed
Action: Send Telegram message
```

---
Next: [Home Assistant](home-assistant.md)
