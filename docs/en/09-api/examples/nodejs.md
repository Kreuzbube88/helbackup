# API Examples: Node.js

## Setup

```javascript
const BASE_URL = 'http://192.168.1.100:3000';
const TOKEN = 'helbackup_YOUR_TOKEN_HERE';
const headers = { 'Authorization': `Bearer ${TOKEN}` };
```

## System Status

```javascript
const response = await fetch(`${BASE_URL}/api/v1/status`, { headers });
const data = await response.json();
console.log(`Status: ${data.data.status}`);
```

## List Jobs

```javascript
const response = await fetch(`${BASE_URL}/api/v1/jobs`, { headers });
const { data: jobs } = await response.json();

jobs.forEach(job => {
  const icon = job.lastStatus === 'success' ? 'OK' : 'FAILED';
  console.log(`[${icon}] ${job.name}`);
});
```

## Trigger Job

```javascript
const response = await fetch(`${BASE_URL}/api/v1/jobs/1/trigger`, {
  method: 'POST',
  headers
});
const result = await response.json();
console.log(`Started: ${result.data.runId}`);
```

## TypeScript Interface

```typescript
interface HelbackupStatus {
  system: string;
  version: string;
  status: 'healthy' | 'degraded' | 'error';
  uptime: number;
  jobs: {
    total: number;
    enabled: number;
    running: number;
  };
  last24h: {
    success: number;
    failed: number;
    warnings: number;
  };
}

async function getStatus(): Promise<HelbackupStatus> {
  const r = await fetch(`${BASE_URL}/api/v1/status`, { headers });
  const { data } = await r.json();
  return data as HelbackupStatus;
}
```

---
Back: [API Overview](../overview.md)
