# Home Assistant Integration

## Option 1: REST Sensor

```yaml
# configuration.yaml
sensor:
  - platform: rest
    name: HELBACKUP Status
    resource: "http://192.168.1.100:3000/api/v1/widget/status"
    headers:
      Authorization: "Bearer helbackup_YOUR_TOKEN"
    value_template: "{{ value_json.data.status }}"
    json_attributes:
      - data
    scan_interval: 300  # alle 5 Minuten
```

## Option 2: Webhook Automation

HELBACKUP sendet Events an HA:

```yaml
# automations.yaml
- alias: HELBACKUP Backup Failed
  trigger:
    - platform: webhook
      webhook_id: helbackup_events
  condition:
    - condition: template
      value_template: "{{ trigger.json.event == 'backup_failed' }}"
  action:
    - service: notify.mobile_app_iphone
      data:
        title: "Backup fehlgeschlagen!"
        message: "{{ trigger.json.data.jobName }} ist fehlgeschlagen"
```

Webhook URL in HELBACKUP:
```
http://homeassistant.local:8123/api/webhook/helbackup_events
```

## Dashboard Card

```yaml
type: entities
title: HELBACKUP
entities:
  - entity: sensor.helbackup_status
    name: Status
  - entity: sensor.helbackup_last_backup
    name: Letztes Backup
  - entity: sensor.helbackup_success_rate
    name: Erfolgsrate (24h)
```

---
Zurück: [Integrationen Overview](overview.md)
