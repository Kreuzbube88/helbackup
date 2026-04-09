# HELBACKUP — Architecture

```mermaid
graph TB
    subgraph Unraid Host
        BOOT["/boot (Flash Drive)"]
        APPDATA["/mnt/user/appdata"]
        VMS["/mnt/user/domains"]
        SOCK["/var/run/docker.sock"]
    end

    subgraph HELBACKUP Container [:3000]
        FE["React 18 SPA\n(Vite / Tailwind)"]
        API["Fastify API\n/api/*"]
        SCH["Scheduler\n(node-schedule)"]
        ENG["Execution Engine\n(steps / retry / manifest)"]
        PRE["Pre-flight\n(array / parity / space)"]
        VER["Verification\n(SHA-256 checksums)"]
        DB["SQLite\n(better-sqlite3, WAL)"]
        ENC["Encryption\n(AES-256-GCM / GPG)"]
        subgraph Steps
            FL["Flash"]
            AP["Appdata"]
            VM["VMs"]
            SC["System Config"]
            SB["Self-Backup"]
            CU["Custom"]
        end
    end

    subgraph Targets
        LOCAL["Local Filesystem"]
        NAS["NAS via SSH+Rsync\n(known_hosts pinning)"]
    end

    Browser -->|HTTP / WebSocket| FE
    FE -->|fetch /api/*| API
    API --> DB
    API --> ENG
    SCH -->|cron tick| ENG
    ENG --> PRE
    PRE -->|parity / df| Unraid Host
    ENG --> Steps
    Steps -->|rsync| LOCAL
    Steps -->|rsync + SSH| NAS
    Steps --> VER
    VER -->|sha256sum -c via SSH stdin| NAS
    ENG --> ENC
    ENG --> DB
    Steps -->|read| BOOT
    Steps -->|read| APPDATA
    Steps -->|read| VMS
    Steps -->|Docker API| SOCK
```

## Component Roles

| Component | Responsibility |
|-----------|---------------|
| **React SPA** | Job wizard, target wizard, recovery UI, live log stream (SSE) |
| **Fastify API** | REST endpoints, JWT auth, rate limiting, SSE |
| **Scheduler** | Cron-based job dispatch, catch-up on restart, concurrency guard |
| **Execution Engine** | Step sequencing, retry, pre-flight, manifest, checksums |
| **Pre-flight** | No parity/mover running, target free space |
| **Verification** | SHA-256 checksums before + after transfer (local and remote via SSH) |
| **Encryption** | AES-256-GCM for credentials (master key from JWT_SECRET), GPG for backup archives |
| **SQLite** | Jobs, targets, history, logs, settings — WAL mode, no ORM |

## Data Flow: Backup Job

```
Cron tick / API trigger
  → Pre-flight checks (array, parity, disk space)
  → NAS Wake-on-LAN (if configured)
  → For each step:
      → Stage into workDir.partial/
      → rsync source → workDir.partial/
      → Generate SHA-256 checksums
      → rsync workDir.partial/ → NAS:remotePath.partial/   [NAS target]
      → Verify remote checksums via SSH stdin               [NAS target]
      → SSH mv remotePath.partial → remotePath             [NAS target]
      → rename workDir.partial → workDir                   [local target]
  → Write manifest.json (paths, checksums, metadata)
  → NAS shutdown (if autoShutdown enabled)
  → Retention cleanup (GFS or simple days)
  → Notifications
```

## Security Model

- **No privileged mode** — only named volume mounts (read-only where possible)
- **JWT_SECRET** → PBKDF2 → master encryption key for all stored credentials
- SSH private keys stored in `/app/config/ssh/` (mode 0600, validated at use)
- SSH host-key pinning via per-target `known_hosts` file (opt-in)
- Login rate limit: 5 attempts / 15 minutes per IP+username
- Self-backup SSH keys always GPG-encrypted regardless of job-level encryption setting
