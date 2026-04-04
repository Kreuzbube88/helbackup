# Recovery — Übersicht

## Recovery-Optionen

| Option | Wann | Umfang |
|--------|------|--------|
| Granular Restore | Einzelne Files/Folders | Selektiv |
| Full Job Restore | Komplettes Backup | Ein Job |
| Full Server Restore | Disaster Recovery | Alles |

## Granular Restore

Einzelne Dateien oder Ordner wiederherstellen.

1. **Navigation:** Recovery → Backup auswählen
2. Datei-Browser öffnen
3. Files/Folders markieren
4. Restore-Pfad angeben
5. "Start Restore"

**Dry Run immer zuerst!**

Details: [Granular Restore](granular-restore.md)

## Full Server Restore

Komplette Server-Wiederherstellung nach Totalausfall.

Wizard-Schritte:
1. Ziel-Server konfigurieren
2. Backup auswählen
3. Restore-Reihenfolge prüfen
4. Pre-Flight Check
5. Restore ausführen

Details: [Full Server Restore](full-server-restore.md)

## Restore-Optionen

```
Overwrite existing: ✅/☐
Dry Run: ✅ (empfohlen zum Testen!)
Verify after restore: ✅
```

## Restore-History

Alle Restores werden protokolliert:
- Navigation: Recovery → History
- Zeigt: Datum, Typ, Ergebnis, Dauer

---
Weiter: [Granular Restore](granular-restore.md) | [Full Server Restore](full-server-restore.md)
