# Recovery Key Management

## Was ist der Recovery Key?

Der Recovery Key ist der **einzige** Zugang zu verschlüsselten Backups.

- Generiert beim Target-Erstellen (einmalig)
- 256-Bit Entropie (kryptographisch sicher)
- Format: `8f2a-9c3b-1e7d-4f6a-2b8c-5d9e-3a7f-6c1b`
- Wird NICHT in HELBACKUP gespeichert (nur du hast ihn!)

## Sicherungsstrategien

### Strategie 1: Passwort-Manager (empfohlen)

```
Service: 1Password / Bitwarden / KeePass
Eintrag: "HELBACKUP Recovery Key - [Server Name]"
Notizen: Target-Name, Erstellungsdatum, Server-IP
```

### Strategie 2: Ausgedruckt

```
Ort: Feuerfester Safe oder Bankschließfach
Format: Key + QR-Code + Datum + Server-Info
```

### Strategie 3: Encrypted Backup des Keys

Ironisch aber sinnvoll: Recovery Key in anderem (nicht-verschlüsseltem) Backup speichern.

## Key Rotation (nicht möglich)

> Recovery Key kann **NICHT** geändert werden!

Wenn neuer Key gewünscht:
1. Neues Target mit neuer Encryption erstellen
2. Neuen Backup-Job auf neues Target zeigen lassen
3. Alte verschlüsselte Backups aufbewahren bis Retention abläuft (alter Key weiterhin sichern!)

## Key Verlust — Was tun?

Wenn Key verloren:
1. **Verschlüsselte Backups:** Verloren. Keine Wiederherstellung möglich.
2. **Neue Backups:** Neues Target ohne Encryption oder mit neuem Key
3. **Lektion:** Key sofort nach Erstellung sichern!

## Recovery Key eingeben (bei Restore)

```
Recovery → Backup auswählen → "Restore"
→ Recovery Key: [Dein Key eingeben]
→ Decryption: Automatisch
```

---
Zurück: [AES-256 Setup](aes256-setup.md)
