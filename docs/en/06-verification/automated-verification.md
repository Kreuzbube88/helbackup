# Automated Verification

## Verify After Backup

Enable in job configuration:

```
Verify after backup: ✅ Quick
```

Quick Verify runs automatically after every successful backup.

## Scheduled Full Verification

Configure separate verification schedules:

```
Full Verify Schedule: 0 4 * * 0
```

Recommendation: Weekly Sunday 04:00 (low activity period).

## Verification Notifications

On failure, a notification is sent automatically (if `verification_failed` event is enabled):

```
Settings → Notifications → Events:
✅ verification_failed
```

---
Back: [Verification Overview](overview.md)
