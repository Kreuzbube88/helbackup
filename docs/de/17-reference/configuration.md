# Konfigurationsoptionen

## Appdata-Struktur

```
/mnt/user/appdata/helbackup/
├── data/
│   └── helbackup.db          # SQLite Datenbank
├── config/
│   └── ssh/                  # SSH Keys (chmod 600)
│       ├── nas_key
│       └── nas_key.pub
└── logs/
    ├── helbackup.log         # Aktuelles Log
    └── helbackup.log.1       # Rotiertes Log
```

## Log-Rotation

Logs werden automatisch rotiert:
- Max Dateigröße: 10 MB
- Max Dateien: 5
- Format: JSON (Pino)

---
Zurück: [Reference Overview](overview.md)
