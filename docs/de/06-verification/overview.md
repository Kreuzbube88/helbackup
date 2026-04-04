# Backup Verifikation

## Warum Verifikation?

- Stille Datei-Korruption (Bit Rot)
- Netzwerk-Fehler beim Backup
- Defekte Festplatten
- Backup "existiert" aber ist beschädigt

## Verifikations-Arten

### Quick Verify
- Prüft: Datei-Existenz, Größe, Timestamp
- Dauer: Sekunden
- Erkennt: Fehlende Dateien, offensichtliche Korruption

### Full Verify
- Prüft: SHA-256 Checksums aller Dateien
- Dauer: Minuten bis Stunden (abhängig von Backup-Größe)
- Erkennt: Stille Datei-Korruption, Bit Rot

## Verifikation durchführen

1. **Navigation:** Recovery → Backup auswählen
2. "Verify" klicken
3. Quick oder Full auswählen
4. Warten auf Ergebnis

## Automatische Verifikation

In Job-Konfiguration:
```
Verify after backup: ✅ Quick (empfohlen)
Full verify schedule: 0 4 * * 0 (wöchentlich Sonntag 04:00)
```

Details: [Automatische Verifikation](automated-verification.md)

## Verifikations-Ergebnisse

**Success:**
```
✅ Verification successful!
Checked: 2,847 files
Size: 23.4 GB
Duration: 4m 32s
SHA-256: All files match
```

**Failed:**
```
❌ Verification failed!
Corrupted files: 3
  - appdata/plex/Library/database.db (SHA-256 mismatch)
  - appdata/nextcloud/config/config.php (missing)
Action required: Re-run backup
```

---
Weiter: [Automatische Verifikation](automated-verification.md)
