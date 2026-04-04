# Email Benachrichtigungen

## SMTP Konfiguration

Settings → Notifications → Email:

```
SMTP Server: smtp.gmail.com
Port: 587
Encryption: STARTTLS
Username: your-email@gmail.com
Password: [App Password]
From: HELBACKUP <your-email@gmail.com>
To: admin@example.com
```

## Gmail App Password

1. Google Account → Security → 2-Step Verification (aktivieren)
2. Security → App passwords → Generate
3. App: "Mail", Device: "Other (Custom name)"
4. Name: "HELBACKUP"
5. Generated password kopieren → in HELBACKUP eintragen

## Andere Provider

**Outlook/Office 365:**
```
SMTP Server: smtp.office365.com
Port: 587
Encryption: STARTTLS
```

**Eigener Mailserver (Postfix):**
```
SMTP Server: mail.yourdomain.com
Port: 587
Encryption: STARTTLS
Username: backup@yourdomain.com
```

## Verbindung testen

1. Settings → Notifications → Email → "Test"
2. Test-Email wird an konfigurierte Adresse gesendet
3. Prüfen ob ankam (auch Spam-Ordner prüfen!)

---
Zurück: [Notifications Overview](overview.md)
