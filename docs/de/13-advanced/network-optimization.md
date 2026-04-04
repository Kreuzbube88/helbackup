# Netzwerk-Optimierung

## SSH Verbindungsoptimierung

SSH-Optionen in `~/.ssh/config` (im Container):

```
Host nas.local
  ControlMaster auto
  ControlPath ~/.ssh/cm_%r@%h:%p
  ControlPersist 30s
  Compression yes
  ServerAliveInterval 10
  ServerAliveCountMax 3
```

## Rsync Delta-Transfers

Rsync überträgt nur geänderte Blöcke:
- `--checksum`: SHA-256 basierte Erkennung (genauer, aber langsamer)
- Standard (Timestamp + Größe): Schneller, ausreichend für die meisten Fälle

## Bandbreiten-Planung

Jobs zu Zeiten mit freier Bandbreite planen:
- Nachts 01:00-05:00: Kein normaler Netzwerktraffic
- Wochenende: Geringere Aktivität

Bandbreite begrenzen damit NAS/Netzwerk nicht gesättigt wird:
```
bwlimit: 50M  (50 MB/s = 400 Mbit/s)
```

## Jumbo Frames

Falls Netzwerk Jumbo Frames unterstützt (9000 MTU):
- Verbesserung: ~5-10% für große Dateiübertragungen
- Unraid: Netzwerkeinstellungen → MTU: 9000
- NAS: Analog konfigurieren

---
Zurück: [Advanced Overview](overview.md)
