# Configuration Options

## Appdata Structure

```
/mnt/user/appdata/helbackup/
├── data/
│   └── helbackup.db          # SQLite database
├── config/
│   ├── ssh/                  # SSH keys (chmod 600)
│   │   ├── nas_key
│   │   └── nas_key.pub
│   └── rclone/               # Rclone configuration
│       └── rclone.conf
└── logs/
    ├── helbackup.log         # Current log
    └── helbackup.log.1       # Rotated log
```

## Log Rotation

Logs are automatically rotated:
- Max file size: 10 MB
- Max files: 5
- Format: JSON (Pino)

## Rclone Configuration

Rclone config at `/app/config/rclone/rclone.conf`.

Edit inside container:
```bash
docker exec -it helbackup rclone config
```

---
Back: [Reference Overview](overview.md)
