# Full Server Restore (Disaster Recovery)

## Wann erscheint der Button?

Der Button **Full Server Restore** erscheint bei einem Backup-Eintrag nur dann, wenn **alle** Bedingungen erfüllt sind:

- Das Backup enthält **mehr als einen Backup-Typ** (z.B. Flash + Appdata)
- Das Backup ist **nicht verschlüsselt** — oder bereits entsperrt

Ein Job der nur einen Step enthält (z.B. nur Flash Drive) zeigt den Button **nicht**. Dort ist nur der normale "Restore"-Button verfügbar.

## Wann Full Server Restore?

- Unraid-Array komplett ausgefallen
- Alle Daten verloren
- Neuer Server / neue Hardware
- Komplette Migration

## Voraussetzungen

- Neuer/wiederhergestellter Unraid-Server
- HELBACKUP Container läuft
- Recovery-Modus aktiv
- Recovery Key (wenn Backup verschlüsselt war)

## Wizard-Ablauf

### Schritt 1: Restore-Komponenten wählen

Der Wizard zeigt die Backup-Typen, die in dem gewählten Backup **tatsächlich enthalten** sind — aktiv und auswählbar. Typen, die nicht gesichert wurden, erscheinen deaktiviert mit dem Hinweis *(nicht im Backup)*:

```
✅ Flash Drive (Unraid Konfiguration)
✅ Appdata (alle Container)
✅ Databases
☐ Virtual Machines          (nicht im Backup)
☐ Docker Images             (nicht im Backup)
☐ System Config             (nicht im Backup)
```

> **Hinweis:** `Databases` ist aktiv, wenn `Appdata` im Backup enthalten ist — Datenbank-Dumps werden aus Container-Konfigurationen erkannt.

### Schritt 2: Restore-Plan prüfen

HELBACKUP generiert einen Plan und zeigt:

- Anzahl der Restore-Items, Gesamtgröße, geschätzte Dauer
- Ausführungsreihenfolge (nach Priorität gruppiert)
- Pre-Flight-Checks:
  - Verfügbarer Speicher ausreichend?
  - Konflikte mit laufenden Containern?
  - Sonstige Warnungen

**Ausführungsreihenfolge (automatisch nach Priorität):**
1. Flash Drive (Basis-Konfiguration)
2. System Config
3. Databases
4. Appdata (inkl. Abhängigkeits-Erkennung: Reverse Proxies und DBs zuerst)
5. Docker Images
6. VMs

Der "Restore ausführen"-Button ist deaktiviert, solange der Speicherplatz nicht ausreicht.

### Schritt 3: Restore läuft

Nach Bestätigung wird der Restore **im Hintergrund** gestartet. Der Wizard zeigt eine Bestätigungs-Seite mit dem Hinweis, die Logs in der History zu verfolgen.

> Unraid nach abgeschlossenem Restore neu starten.

## Nach dem Restore

1. History-Logs prüfen (Verlauf → letzter Eintrag)
2. Unraid neu starten
3. Container prüfen: Alle gestartet?
4. Daten stichprobenartig testen

---
Zurück: [Recovery Overview](overview.md)
