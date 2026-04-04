# Granular Restore

Einzelne Dateien oder Verzeichnisse aus einem Backup wiederherstellen.

## Wann Granular Restore?

- Versehentlich gelöschte Datei
- Überschriebene Konfiguration
- Bestimmte Container-Konfiguration wiederherstellen
- Einzelne Datenbank

## Ablauf

1. **Navigation:** Recovery
2. Backup in der Liste auswählen
3. "Browse Files" klicken
4. Im Datei-Browser navigieren
5. Dateien/Ordner markieren (Checkbox)
6. Restore-Ziel angeben:

```
Restore To: /mnt/user/appdata/nextcloud/config/
Overwrite existing: ✅
Dry Run: ✅ (zuerst!)
```

7. "Start Restore" klicken

## Dry Run

Immer zuerst Dry Run durchführen:
```
Dry Run: ✅ aktiviert
→ Zeigt was wiederhergestellt werden würde
→ Keine echten Änderungen

Dry Run: ☐ deaktiviert
→ Echter Restore
```

## Restore verschlüsselter Backups

Bei encrypted Targets:
```
Recovery Key: [Key eingeben]
→ Automatische Entschlüsselung
```

---
Zurück: [Recovery Overview](overview.md)
