# Scheduling (Cron)

## Cron Format

```
* * * * *
│ │ │ │ └── Wochentag (0=So, 1=Mo, ..., 6=Sa)
│ │ │ └──── Monat (1-12)
│ │ └────── Tag des Monats (1-31)
│ └──────── Stunde (0-23)
└────────── Minute (0-59)
```

## Häufige Schedules

| Cron | Bedeutung |
|------|-----------|
| `@daily` | Täglich um 00:00 |
| `@hourly` | Stündlich |
| `@weekly` | Wöchentlich (Sonntag 00:00) |
| `@monthly` | Monatlich (1. um 00:00) |
| `0 2 * * *` | Täglich um 02:00 |
| `0 2 * * 0` | Sonntags um 02:00 |
| `0 2 1 * *` | Monatlich, 1. um 02:00 |
| `0 */6 * * *` | Alle 6 Stunden |
| `30 1 * * 1-5` | Mo-Fr um 01:30 |

## Empfohlene Zeiten

- **Nachts 01:00–04:00:** Geringste Aktivität auf Unraid
- **Gestaffelt:** Jobs nicht gleichzeitig starten
- **Vor Parity Check:** Backup nicht während Parity planen

## Cron-Konflikte vermeiden

Wenn mehrere Jobs vorhanden:
```
Flash Backup:   0 1 * * *   (01:00)
Appdata Backup: 0 2 * * *   (02:00)
VM Backup:      0 3 * * 0   (03:00, nur Sonntag)
```

## Cron Validator

HELBACKUP validiert den Cron-Ausdruck automatisch und zeigt:
- Nächste 5 Ausführungszeiten
- Fehlermeldung bei ungültigem Format

---
Zurück: [Jobs erstellen](creating-jobs.md)
