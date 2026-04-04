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
    scan_interval: 300  # every 5 minutes
```

## Option 2: Webhook Automation

HELBACKUP sends events to HA:

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
        title: "Backup failed!"
        message: "{{ trigger.json.data.jobName }} failed"
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
    name: Last Backup
  - entity: sensor.helbackup_success_rate
    name: Success Rate (24h)
```

---
Back: [Integrations Overview](overview.md)
