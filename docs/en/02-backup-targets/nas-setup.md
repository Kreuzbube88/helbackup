# NAS Target Setup (Synology / QNAP)

## Prerequisites

- NAS on the same network as Unraid
- SSH enabled on NAS
- Backup user created on NAS

## Generate SSH Key

HELBACKUP auto-generates an SSH key when creating a target.
Or manually:

```bash
# In HELBACKUP container
ssh-keygen -t ed25519 -f /app/config/ssh/nas_key -N ""
cat /app/config/ssh/nas_key.pub
```

Add public key to NAS:
```bash
# On NAS (SSH)
echo "PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Configure Target

```
Type: NAS (SSH+Rsync)
Name: Synology NAS
Host: 192.168.1.200
Port: 22
Username: helbackup
SSH Key: /app/config/ssh/nas_key
Remote Path: /volume1/Backups/helbackup
```

## Test Connection

1. Target → "Test Connection"
2. Result: "Connection successful!"

If errors:
- SSH port correct? (default: 22)
- Firewall on NAS?
- User has write access to Remote Path?

## WOL (Wake-on-LAN)

Wake NAS automatically before backup:

```
Wake-on-LAN: ✅
MAC Address: 00:11:22:33:44:55
Wait for NAS: 60 seconds
Shutdown after backup: ✅
```

### WOL in Docker networks (br0 / macvlan)

HELBACKUP sends the magic packet in parallel across **all** available IPv4
interfaces, to the subnet broadcast, `255.255.255.255`, **and** unicast to
the configured NAS IP, on both port 7 and port 9.

- The **NAS IP** field matters — not just the MAC. Some Docker network
  modes (`br0`, macvlan, ipvlan) silently drop broadcast traffic; the
  unicast path bypasses that restriction.
- If WOL still fails, as a workaround switch the container to
  `network_mode: host` in `docker-compose.yml` (remove the `networks:` /
  `br0` block). Note that existing port bindings and reverse proxy
  configuration must be adjusted accordingly.

---
Back: [Target Overview](overview.md)
