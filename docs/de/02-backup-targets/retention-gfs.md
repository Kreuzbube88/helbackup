# GFS Retention (Grandfather-Father-Son)

## Was ist GFS?

GFS ist eine Backup-Rotation-Strategie die verschiedene Aufbewahrungszeiträume kombiniert:

- **Son (täglich):** Letzte 7 Tage
- **Father (wöchentlich):** Letzte 4 Wochen (jeweils Samstag)
- **Grandfather (monatlich):** Letzte 12 Monate (jeweils 1. des Monats)
- **Ancestor (jährlich):** Letzte 3 Jahre (jeweils 1. Januar)

## Beispiel: Speichervergleich

**Szenario:** 180 Tage Backup-Daten

| Strategie | Anzahl Backups | Speicher |
|-----------|---------------|---------|
| Simple (alle) | 180 | 180 GB |
| GFS | ~26 | ~26 GB |
| **Ersparnis** | **—** | **~86%** |

## Welche Backups bleiben erhalten?

Bei GFS-Cleanup (heute = 15. März 2024):

**Son (täglich, letzte 7):**
- 14. März, 13. März, 12. März, ..., 8. März

**Father (wöchentlich, letzte 4 Samstage):**
- 9. März, 2. März, 24. Feb, 17. Feb

**Grandfather (monatlich, letzte 12 × 1.):**
- 1. März, 1. Feb, 1. Jan, ..., 1. April 2023

**Ancestor (jährlich, letzte 3 × 1. Jan):**
- 1. Jan 2024, 1. Jan 2023, 1. Jan 2022

## GFS in HELBACKUP konfigurieren

1. Target erstellen/editieren
2. Retention Type: **GFS**
3. Werte eingeben:

```
Daily Backups:    7
Weekly Backups:   4
Monthly Backups: 12
Yearly Backups:   3
```

## GFS Cleanup Preview

> **IMMER Preview anschauen bevor Cleanup ausgeführt wird!**

1. Target → "GFS Preview"
2. Liste zeigt: "These backups will be deleted"
3. Prüfen ob richtig
4. "Run Cleanup" erst dann klicken

## Wann GFS nutzen?

**GFS empfohlen wenn:**
- Backup-Target hat begrenzten Speicher
- Langzeit-Retention erwünscht (Jahre)
- Compliance-Anforderungen (monatliche/jährliche Backups)

**Simple Retention wenn:**
- Nur kurze Retention nötig (7-30 Tage)
- Speicher ist kein Problem

---
Zurück: [Target Overview](overview.md)
