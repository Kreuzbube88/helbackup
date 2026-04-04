# Backup-Strategie

## 3-2-1 Regel

Die bewährte Backup-Strategie:

```
3 Kopien der Daten
2 verschiedene Speichermedien
1 Kopie Off-site
```

**Beispiel-Setup:**
```
Original:    Unraid Array          (1. Kopie)
Lokal:       Separate USB/HDD      (2. Kopie, anderes Medium)
Off-site:    Backblaze B2 Cloud    (3. Kopie, Off-site)
```

## Empfohlene Job-Struktur

```
Job 1: Flash Backup
  Schedule: täglich 01:00
  Target: Local + Cloud
  Types: Flash Drive

Job 2: Appdata Backup
  Schedule: täglich 02:00
  Target: NAS + Cloud
  Types: Appdata, Databases

Job 3: VM Backup
  Schedule: wöchentlich Sonntag 03:00
  Target: NAS
  Types: VMs, Docker Images
```

## Restore testen

**Monatlich:**
- [ ] Zufälliges Backup auswählen
- [ ] Quick Verify durchführen
- [ ] Granular Restore einer Datei testen
- [ ] Ergebnis prüfen

**Jährlich:**
- [ ] Full Server Restore Dry Run
- [ ] Disaster Recovery Plan durchspielen

> **Ein Backup ohne getesteten Restore ist kein Backup!**

## Retention Empfehlungen

| Daten | Retention |
|-------|-----------|
| Flash Drive | GFS: 7/4/12/3 |
| Appdata | GFS: 7/4/12/1 |
| VMs | Simple: 90 Tage |
| Databases | GFS: 30/4/6/1 |
| Docker Images | Simple: 30 Tage |

## Monitoring

Mindestens überwachen:
- `backup_failed` → sofortige Benachrichtigung
- `disk_space_low` → bevor Backups fehlschlagen

---
Weiter: [Security Best Practices](security.md)
