# API Beispiele: Python

## Setup

```python
import requests

BASE_URL = "http://192.168.1.100:3000"
TOKEN = "helbackup_YOUR_TOKEN_HERE"

headers = {
    "Authorization": f"Bearer {TOKEN}"
}
```

## System-Status

```python
response = requests.get(f"{BASE_URL}/api/v1/status", headers=headers)
data = response.json()

if data["success"]:
    print(f"Status: {data['data']['status']}")
    print(f"Last 24h success: {data['data']['last24h']['success']}")
```

## Alle Jobs anzeigen

```python
response = requests.get(f"{BASE_URL}/api/v1/jobs", headers=headers)
jobs = response.json()["data"]

for job in jobs:
    status = "OK" if job["lastStatus"] == "success" else "FAILED"
    print(f"[{status}] {job['name']} — Next: {job['nextRun']}")
```

## Job triggern

```python
job_id = "1"
response = requests.post(
    f"{BASE_URL}/api/v1/jobs/{job_id}/trigger",
    headers=headers
)
result = response.json()
print(f"Job started: {result['data']['runId']}")
```

## Backup-History analysieren

```python
response = requests.get(
    f"{BASE_URL}/api/v1/history",
    headers=headers,
    params={"limit": 100}
)
history = response.json()["data"]

failed = [h for h in history if h["status"] == "failed"]
print(f"Failed backups in last 100: {len(failed)}")
```

## Monitoring Script

```python
import requests
import sys

def check_helbackup(base_url: str, token: str) -> int:
    """Returns 0 if healthy, 1 if problems, 2 if unreachable."""
    headers = {"Authorization": f"Bearer {token}"}

    try:
        r = requests.get(f"{base_url}/api/v1/status", headers=headers, timeout=10)
        data = r.json()
    except Exception as e:
        print(f"CRITICAL: Cannot reach HELBACKUP: {e}")
        return 2

    if not data["success"]:
        print(f"CRITICAL: API error: {data['error']['message']}")
        return 2

    last24h = data["data"]["last24h"]
    if last24h["failed"] > 0:
        print(f"WARNING: {last24h['failed']} backup(s) failed in last 24h")
        return 1

    print(f"OK: All {last24h['success']} backups successful")
    return 0

if __name__ == "__main__":
    sys.exit(check_helbackup(
        "http://192.168.1.100:3000",
        "helbackup_YOUR_TOKEN"
    ))
```

---
Zurück: [API Overview](../overview.md)
