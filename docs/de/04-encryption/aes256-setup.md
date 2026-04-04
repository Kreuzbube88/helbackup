# AES-256 Encryption

## Warum Encryption?

- **Off-site Backups:** Cloud/NAS gehören nicht dir
- **Datenschutz:** DSGVO-Compliance
- **Sicherheit:** Einbruch beim Provider → Daten trotzdem sicher

## AES-256 in HELBACKUP

- Algorithmus: AES-256-GCM (authenticated encryption)
- Key-Derivation: PBKDF2 mit 100.000 Iterationen
- Verschlüsselung: Stream-basiert (große Dateien möglich)

## Encryption aktivieren

1. Target erstellen/editieren
2. **Encrypted:** aktivieren
3. Recovery Key wird generiert:

```
Recovery Key: 8f2a-9c3b-1e7d-4f6a-2b8c-5d9e-3a7f-6c1b
```

> **KRITISCH: Diesen Key JETZT sichern! Er wird NIE WIEDER angezeigt!**

4. Key in Passwort-Manager speichern (1Password, Bitwarden, etc.)
5. "Save" klicken

## Recovery Key sicher aufbewahren

**Empfohlen:**
- Passwort-Manager (1Password, Bitwarden)
- Ausgedruckt in Safe/Bankschließfach
- Verschlüsselte Notiz (Obsidian, Standard Notes)

**Nicht empfohlen:**
- Nur im Kopf
- Unverschlüsselte Textdatei
- E-Mail

> **Key verloren = Backups verloren. Ohne Key keine Entschlüsselung möglich!**

Mehr Details: [Recovery Key Management](recovery-key.md)

## Performance

AES-256 ist hardware-beschleunigt (AES-NI):
- Overhead: ~10-20%
- Typische CPUs: >1 GB/s Verschlüsselungsrate
- Kein spürbarer Unterschied bei normalen Backups

---
Weiter: [Recovery Key Management](recovery-key.md)
