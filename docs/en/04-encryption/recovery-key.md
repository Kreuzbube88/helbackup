# Recovery Key Management

## What is the Recovery Key?

The Recovery Key is the **only** way to access encrypted backups.

- Generated once during the Encryption Setup Wizard
- NOT stored in HELBACKUP (only you have it!)

The format is: `HLBK-ENC-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX` (4 × 8 hex chars = 128 bits of entropy)

> **Backward compatibility:** Recovery keys generated with an older version of HELBACKUP remain valid.

## Storage Strategies

### Strategy 1: Password Manager (recommended)

```
Service: 1Password / Bitwarden / KeePass
Entry: "HELBACKUP Recovery Key - [Server Name]"
Notes: Target name, creation date, server IP
```

### Strategy 2: Printed

```
Location: Fireproof safe or bank vault
Format: Key + QR code + date + server info
```

### Strategy 3: Encrypted Key Backup

Store the recovery key in another (non-encrypted) backup.

## Key Rotation (not possible)

> Recovery Key **CANNOT** be changed!

If you need a new key:
1. Create new Target with new encryption
2. Point new job to new target
3. Keep old encrypted backups until retention expires (keep old key!)

## Lost Key — What to do?

1. **Encrypted backups:** Lost. No recovery possible.
2. **New backups:** Create new Target without encryption or with new key
3. **Lesson:** Save key immediately after creation!

## Entering Recovery Key (for Restore)

```
Recovery → Select backup → "Restore"
→ Recovery Key: [Enter your key]
→ Decryption: Automatic
```

---
Back: [AES-256 Setup](aes256-setup.md)
