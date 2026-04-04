# Datenbank-Schema

SQLite WAL-Mode Datenbank unter `/app/data/helbackup.db`.

## Tabellen

### jobs

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | TEXT PRIMARY KEY | UUID |
| name | TEXT | Job-Name |
| enabled | INTEGER | 0 oder 1 (boolean) |
| schedule | TEXT | Cron-Ausdruck |
| target_id | TEXT | Referenz auf targets.id |
| steps | TEXT | JSON: JobStep[] |
| created_at | TEXT | ISO 8601 Timestamp |
| updated_at | TEXT | ISO 8601 Timestamp |

### targets

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | TEXT PRIMARY KEY | UUID |
| name | TEXT | Target-Name |
| type | TEXT | local/nas/cloud |
| config | TEXT | JSON: Konfiguration |
| enabled | INTEGER | 0 oder 1 |
| encrypted | INTEGER | 0 oder 1 |

### job_history

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | TEXT PRIMARY KEY | Run-ID |
| job_id | TEXT | Referenz auf jobs.id |
| status | TEXT | success/failed/warning/running |
| started_at | TEXT | ISO 8601 |
| completed_at | TEXT | ISO 8601 (nullable) |
| duration | INTEGER | Sekunden |
| size | INTEGER | Bytes |
| error | TEXT | Fehlermeldung (nullable) |

### settings

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| key | TEXT PRIMARY KEY | Setting-Key |
| value | TEXT | JSON-Wert |

### api_tokens

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | TEXT PRIMARY KEY | Token-ID |
| name | TEXT | Token-Name |
| token_hash | TEXT | bcrypt Hash |
| scopes | TEXT | JSON: string[] |
| expires_at | TEXT | ISO 8601 (nullable) |
| last_used | TEXT | ISO 8601 (nullable) |

---
Zurück: [Reference Overview](overview.md)
