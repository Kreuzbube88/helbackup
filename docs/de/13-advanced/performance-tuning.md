# Performance Tuning

## Rsync Optimierungen

Standard HELBACKUP Flags:
```bash
rsync -az --checksum --bwlimit=50M --progress
```

### Bandbreite begrenzen

```
Bandwidth Limit: 50M  (50 MB/s — Standard)
```

Anpassen im Job:
- 10M für langsame NAS-Verbindungen
- 100M für schnelle lokale Verbindungen
- 0 = kein Limit (Vorsicht!)

### Parallelisierung

Mehrere Jobs können parallel laufen — aber Vorsicht mit:
- I/O-Last auf Unraid-Disks
- Netzwerk-Sättigung zur NAS
- RAM-Verbrauch

Empfehlung: Jobs zeitlich staffeln (1h Abstand).

## SQLite Optimierungen

HELBACKUP nutzt WAL-Mode:
```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
```

Für viele gleichzeitige Schreiboperationen: Standard-Konfiguration reicht.

## SSH Verbindungswiederverwendung

SSH Connections werden innerhalb eines Jobs wiederverwendet (ControlMaster).
Timeout: 30 Sekunden nach letzter Verwendung.

## Kompression

Rsync-Kompression (`-z`) ist aktiviert für Netzwerk-Targets.
Für lokale Targets deaktivieren (overhead ohne Vorteil):

```
Local Target: Compression: ☐ (deaktiviert)
NAS Target:   Compression: ✅ (aktiviert)
```

---
Zurück: [Advanced Overview](overview.md)
