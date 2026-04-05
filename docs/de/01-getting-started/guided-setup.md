# Geführte Einrichtung

HELBACKUP enthält zwei Onboarding-Tools für neue Benutzer: die **Onboarding-Tour** und den **Ersten-Backup-Wizard**.

---

## Onboarding-Tour

Die Onboarding-Tour wird automatisch beim **ersten Login** nach der initialen Einrichtung angezeigt. Es handelt sich um ein Willkommens-Modal, das einen kurzen Überblick über die drei Einstiegsschritte gibt:

1. **Target erstellen** — definieren, wo Backups gespeichert werden (lokale Disk, NAS oder Cloud)
2. **Backup-Job erstellen** — festlegen, was gesichert wird und nach welchem Schedule
3. **Erstes Backup ausführen** — sofort starten oder auf den geplanten Zeitpunkt warten

### Optionen

| Schaltfläche | Effekt |
|--------|--------|
| **Guide starten** | Schließt die Tour und öffnet den Ersten-Backup-Wizard |
| **Überspringen** | Schließt die Tour und markiert das Onboarding als abgeschlossen |

Der Onboarding-Status wird im Browser-`localStorage` gespeichert (`helbackup_onboarding_done`). Nach dem Überspringen oder Abschließen erscheint die Tour nicht mehr, es sei denn, der Browser-Speicher wird geleert.

---

## Erster-Backup-Wizard

Der Wizard führt durch die Erstellung eines Backup-Targets und eines Backup-Jobs in einem einzigen Ablauf. Er ist über den **"Quick Start Guide"**-Button auf folgenden Seiten erreichbar:

- Dashboard
- Jobs
- Targets
- Recovery

### Schritte

| Schritt | Was passiert |
|---------|--------------|
| **1 — Target** | Target-Typ wählen (Local, NAS, Rclone) und Verbindungsdaten eingeben |
| **2 — Backup-Typen** | Auswählen, was gesichert wird: Flash Drive, Appdata, VMs, Docker Images, System Config |
| **3 — Schedule & Name** | Job benennen und Cron-Schedule festlegen |
| **4 — Review** | Alle Einstellungen vor dem Speichern bestätigen |
| **5 — Fertig** | Target und Job wurden erstellt; der Job kann sofort gestartet werden |

### Target-Typen

- **Local** — Pfad auf dem Unraid-Array (z.B. `/mnt/user/backups`)
- **NAS** — SSH+Rsync zu einem Synology- oder QNAP-NAS; unterstützt Wake-on-LAN und Auto-Shutdown
- **Rclone** — beliebige der 40+ Cloud-Anbieter über ein vorkonfiguriertes Rclone-Remote

### Wizard schließen

Wird der Wizard mittendrin geschlossen, erscheint eine Bestätigungsaufforderung. Target und Job werden erst nach Abschluss von Schritt 5 angelegt.

---

Nächste Seite: [Grundkonzepte](concepts.md)
