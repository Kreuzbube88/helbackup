# Database Schema

SQLite WAL-mode database at `/app/data/helbackup.db`.

## Tables

### jobs

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID |
| name | TEXT | Job name |
| enabled | INTEGER | 0 or 1 (boolean) |
| schedule | TEXT | Cron expression |
| target_id | TEXT | Reference to targets.id |
| steps | TEXT | JSON: JobStep[] |
| created_at | TEXT | ISO 8601 timestamp |
| updated_at | TEXT | ISO 8601 timestamp |

### targets

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID |
| name | TEXT | Target name |
| type | TEXT | local/nas/cloud |
| config | TEXT | JSON: configuration |
| enabled | INTEGER | 0 or 1 |
| encrypted | INTEGER | 0 or 1 |

### job_history

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Run ID |
| job_id | TEXT | Reference to jobs.id |
| status | TEXT | success/failed/warning/running |
| started_at | TEXT | ISO 8601 |
| completed_at | TEXT | ISO 8601 (nullable) |
| duration | INTEGER | Seconds |
| size | INTEGER | Bytes |
| error | TEXT | Error message (nullable) |

### settings

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT PRIMARY KEY | Setting key |
| value | TEXT | JSON value |

### api_tokens

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Token ID |
| name | TEXT | Token name |
| token_hash | TEXT | bcrypt hash |
| scopes | TEXT | JSON: string[] |
| expires_at | TEXT | ISO 8601 (nullable) |
| last_used | TEXT | ISO 8601 (nullable) |

---
Back: [Reference Overview](overview.md)
