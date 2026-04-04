# Cron Referenz

## Format

```
┌───────────── Minute (0-59)
│ ┌───────────── Stunde (0-23)
│ │ ┌───────────── Tag des Monats (1-31)
│ │ │ ┌───────────── Monat (1-12)
│ │ │ │ ┌───────────── Wochentag (0=So, 6=Sa)
│ │ │ │ │
* * * * *
```

## Spezielle Ausdrücke

| Ausdruck | Entspricht | Bedeutung |
|----------|-----------|-----------|
| `@yearly` / `@annually` | `0 0 1 1 *` | Jährlich, 1. Januar |
| `@monthly` | `0 0 1 * *` | Monatlich, 1. des Monats |
| `@weekly` | `0 0 * * 0` | Wöchentlich, Sonntag |
| `@daily` / `@midnight` | `0 0 * * *` | Täglich um Mitternacht |
| `@hourly` | `0 * * * *` | Stündlich |

## Sonderzeichen

| Zeichen | Bedeutung | Beispiel |
|---------|-----------|---------|
| `*` | Jeder Wert | `* * * * *` = jede Minute |
| `,` | Liste | `1,15 * * * *` = Minute 1 und 15 |
| `-` | Bereich | `1-5 * * * *` = Minute 1 bis 5 |
| `/` | Schrittweite | `*/5 * * * *` = alle 5 Minuten |

## Häufige Ausdrücke

| Cron | Zeitplan |
|------|---------|
| `0 2 * * *` | Täglich 02:00 |
| `0 2 * * 0` | Sonntags 02:00 |
| `0 2 1 * *` | Monatlich, 1. um 02:00 |
| `0 */6 * * *` | Alle 6 Stunden |
| `30 1 * * 1-5` | Mo-Fr um 01:30 |
| `0 2 * * 1,4` | Mo und Do um 02:00 |

---
Zurück: [Reference Overview](overview.md)
