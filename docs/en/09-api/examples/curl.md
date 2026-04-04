# API Examples: curl

## Setup

```bash
BASE_URL="http://192.168.1.100:3000"
TOKEN="helbackup_YOUR_TOKEN_HERE"
```

## System Status

```bash
curl -s "$BASE_URL/api/v1/status" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## List All Jobs

```bash
curl -s "$BASE_URL/api/v1/jobs" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[].name'
```

## Trigger Job

```bash
curl -s -X POST "$BASE_URL/api/v1/jobs/1/trigger" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## Backup History

```bash
# Last 10 backups
curl -s "$BASE_URL/api/v1/history?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Failed only
curl -s "$BASE_URL/api/v1/history?status=failed" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## Widget Status

```bash
curl -s "$BASE_URL/api/v1/widget/status" \
  -H "Authorization: Bearer $TOKEN" | jq .data.status
```

## Prometheus Metrics

```bash
# No auth required
curl -s "$BASE_URL/metrics"
```

## Error Handling

```bash
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/status" \
  -H "Authorization: Bearer $TOKEN")

body=$(echo "$response" | head -n1)
status=$(echo "$response" | tail -n1)

if [ "$status" -eq 200 ]; then
  echo "OK: $(echo $body | jq .data.status)"
else
  echo "Error $status: $(echo $body | jq .error.message)"
fi
```

---
Back: [API Overview](../overview.md)
