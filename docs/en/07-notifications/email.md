# Email Notifications

## SMTP Configuration

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

1. Google Account → Security → 2-Step Verification (enable)
2. Security → App passwords → Generate
3. App: "Mail", Device: "Other (Custom name)"
4. Name: "HELBACKUP"
5. Copy generated password → enter in HELBACKUP

## Other Providers

**Outlook/Office 365:**
```
SMTP Server: smtp.office365.com
Port: 587
Encryption: STARTTLS
```

**Own mail server (Postfix):**
```
SMTP Server: mail.yourdomain.com
Port: 587
Encryption: STARTTLS
Username: backup@yourdomain.com
```

## Test Connection

1. Settings → Notifications → Email → "Test"
2. Test email sent to configured address
3. Check inbox (also check spam folder!)

---
Back: [Notifications Overview](overview.md)
