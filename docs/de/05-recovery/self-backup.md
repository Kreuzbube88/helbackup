# Selbst-Backup-Anleitung

HELBACKUP kann sich selbst sichern — Datenbank, Konfiguration und SSH-Keys —
damit eine vollständige Wiederherstellung auch dann möglich ist, wenn der Server
komplett ausgefallen ist.

---

## Warum du ein Selbst-Backup brauchst

Deine Unraid-Daten sind nur wiederherstellbar, wenn du zuerst HELBACKUP selbst
wiederherstellen kannst. Ohne Selbst-Backup verlierst du:

- Alle **Job-Definitionen** (Zeitpläne, Schritte, Target-Zuweisungen)
- Alle **Target-Konfigurationen** (NAS-Zugangsdaten, SSH-Keys, Pfade)
- Den gesamten **Backup-Verlauf** (Logs, Prüfsummen, Verifikationsergebnisse)
- Alle **Einstellungen** der Anwendung

Mit einem Selbst-Backup dauert die vollständige Wiederherstellung Minuten statt
Stunden manueller Neukonfiguration. Siehe [Disaster Recovery — Tag Null](disaster-recovery-day-zero.md).

---

## Was das Selbst-Backup enthält

| Inhalt | Pfad im Archiv | Hinweise |
|--------|----------------|----------|
| SQLite-Datenbank | `helbackup.db` | Jobs, Targets, Verlauf, Einstellungen, Logs |
| SSH Private Keys | `ssh/` | Für NAS-Targets — innerhalb des Archivs verschlüsselt |
| Anwendungskonfiguration | `config/` | JWT_SECRET ausgenommen (Umgebungsvariable) |

Das Archiv ist eine `.tar.gz`-Datei (oder `.tar.gz.gpg` bei aktivierter
Job-Verschlüsselung). SSH Private Keys werden unabhängig von der
Job-Verschlüsselung immer mit einer zusätzlichen GPG-Schicht gesichert —
die Keys werden also niemals im Klartext gespeichert.

> **Wichtig:** Die Umgebungsvariable `JWT_SECRET` ist **nicht** im Selbst-Backup
> enthalten. Sie muss separat gesichert werden (Passwort-Manager, Vault). Nach
> einer Wiederherstellung verwendet der Container das JWT_SECRET aus der neuen
> `.env`-Datei — aktive Browser-Sitzungen werden ungültig, die Datenbank selbst
> bleibt aber intakt.

---

## Wo das Selbst-Backup gespeichert werden sollte

> **Speichere das Selbst-Backup NICHT auf demselben Target wie deine primären Datensicherungen.**

Wenn das NAS, auf dem deine Appdata-Backups liegen, ebenfalls zerstört oder
nicht erreichbar ist, benötigst du das Selbst-Backup genau für die
Wiederherstellung dieser Target-Konfiguration — ein Zirkel, den du nicht
durchbrechen kannst.

**Empfohlene Speicherorte:**

| Option | Beispielpfad | Begründung |
|--------|-------------|------------|
| Zweites NAS-Target | Separates SSH+Rsync-Target auf einem anderen Host | Beste Isolation |
| Lokales Dateisystem auf USB-Stick | `/mnt/disks/usb-stick/helbackup-self/` | Einfach, Offline-Kopie |
| Gleiches NAS, andere Freigabe | Nur wenn kein zweites Target verfügbar — mindestens ein anderer Share-Pfad | Teilweise Isolation |

Das Selbst-Backup ist klein (typisch 1–20 MB). Eine Aufbewahrung von 7 täglichen
+ 4 wöchentlichen Kopien (GFS) ist mehr als ausreichend.

---

## Selbst-Backup-Job anlegen

1. **Jobs → Neuer Job** aufrufen
2. Einen Schritt vom Typ **HELBACKUP Selbst-Backup** hinzufügen
3. Ein Target zuweisen, das sich **vom primären Appdata-Target unterscheidet**
4. Einen Zeitplan festlegen — täglich um 03:00 ist ein guter Standard:
   ```
   0 3 * * *
   ```
5. Optional **Verschlüsselung** aktivieren — starkes Passwort verwenden und
   den Recovery-Key (`HLBK-ENC-XXXX-XXXX-XXXX-XXXX`) im Passwort-Manager speichern
6. Speichern und einmal manuell ausführen, um die Funktion zu bestätigen

Das resultierende Backup-Verzeichnis enthält:

```
<target-pfad>/helbackup/YYYY-MM-DD/
  manifest.json
  helbackup-self-YYYY-MM-DDTHH-mm-ss.tar.gz          # unverschlüsselt
  helbackup-self-YYYY-MM-DDTHH-mm-ss.tar.gz.gpg       # verschlüsselte Variante
```

---

## Wiederherstellung aus einem Selbst-Backup

Siehe [Disaster Recovery — Tag Null → Schritt 3a](disaster-recovery-day-zero.md#schritt-3a--helbackup-selbstsicherung-wiederherstellen)
für den vollständigen Ablauf. Kurzfassung:

1. Einen frischen HELBACKUP-Container starten (leeres `/app/data`)
2. Das Laufwerk / NAS mit dem Selbst-Backup als Volume einbinden
3. **Recovery → Backups scannen** → Einhängepfad eingeben
4. Den neuesten **HELBACKUP Selbst-Backup**-Eintrag auswählen → **Wiederherstellen**
5. `docker restart helbackup`
6. Einloggen — alle Jobs, Targets und der Verlauf sind wieder vorhanden

---

## Recovery-Key

Falls der Selbst-Backup-Job mit Verschlüsselung aktiviert ist, generiert
HELBACKUP bei der Job-Erstellung einen Recovery-Key:

```
HLBK-ENC-XXXX-XXXX-XXXX-XXXX
```

**Bewahre diesen Key getrennt vom Backup selbst auf.** Empfohlene Orte:

- Passwort-Manager (Bitwarden, 1Password, KeePass)
- Ausgedruckte Kopie im Safe
- Separate Cloud-Notiz (nicht im selben Konto wie dein Unraid-Login)

Ohne den Recovery-Key kann ein verschlüsseltes Selbst-Backup **nicht entschlüsselt**
werden. Es gibt keine Hintertür.

---

## Checkliste

- [ ] Ein Selbst-Backup-Job existiert und ist aktiviert
- [ ] Das Target für das Selbst-Backup unterscheidet sich vom primären Appdata-Target
- [ ] Der Recovery-Key ist im Passwort-Manager / an einem Offline-Ort gespeichert
- [ ] Der Job wurde mindestens einmal erfolgreich ausgeführt (grün in der Historie)
- [ ] Die Wiederherstellung wurde mindestens einmal getestet (siehe Tag-Null-Anleitung)

---

Zurück: [Vollständige Server-Wiederherstellung](full-server-restore.md) | Weiter: [Disaster Recovery — Tag Null](disaster-recovery-day-zero.md)
