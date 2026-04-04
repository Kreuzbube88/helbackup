# API Beispiele: PowerShell

## Setup

```powershell
$BaseUrl = "http://192.168.1.100:3000"
$Token = "helbackup_YOUR_TOKEN_HERE"
$Headers = @{ "Authorization" = "Bearer $Token" }
```

## System-Status

```powershell
$Response = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/status" `
  -Headers $Headers

Write-Host "Status: $($Response.data.status)"
Write-Host "Success 24h: $($Response.data.last24h.success)"
```

## Alle Jobs

```powershell
$Response = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/jobs" `
  -Headers $Headers

$Response.data | ForEach-Object {
  $Icon = if ($_.lastStatus -eq "success") { "OK" } else { "FAILED" }
  Write-Host "[$Icon] $($_.name)"
}
```

## Job triggern

```powershell
$Response = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/jobs/1/trigger" `
  -Method POST `
  -Headers $Headers

Write-Host "Started: $($Response.data.runId)"
```

## Monitoring Script

```powershell
function Test-HelbackupHealth {
  param(
    [string]$BaseUrl = "http://192.168.1.100:3000",
    [string]$Token
  )

  $Headers = @{ "Authorization" = "Bearer $Token" }

  try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/api/v1/status" -Headers $Headers
    $Failed = $Response.data.last24h.failed

    if ($Failed -gt 0) {
      Write-Warning "$Failed backup(s) failed in last 24h!"
      return $false
    }

    Write-Host "All backups OK" -ForegroundColor Green
    return $true
  }
  catch {
    Write-Error "Cannot reach HELBACKUP: $_"
    return $false
  }
}

# Verwendung
Test-HelbackupHealth -BaseUrl "http://192.168.1.100:3000" -Token "helbackup_TOKEN"
```

---
Zurück: [API Overview](../overview.md)
