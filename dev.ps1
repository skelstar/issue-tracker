# Starts the issue tracker locally: API server (3001) + Vite client (3000).
# Usage (from project root):  .\dev.ps1
# If blocked by execution policy:  powershell -ExecutionPolicy Bypass -File dev.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# Install dependencies on first run or when package-lock.json changed since the last install.
$stamp = 'node_modules/.package-lock.json'
if (-not (Test-Path $stamp) -or (Get-Item 'package-lock.json').LastWriteTime -gt (Get-Item $stamp).LastWriteTime) {
    Write-Host 'Installing dependencies...' -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
}

# Stop anything already listening on the app's ports (e.g. a previous run left open).
foreach ($port in 3000, 3001) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object {
            Write-Host "Stopping process $_ on port $port" -ForegroundColor Yellow
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
}

# Open the browser once the client is up, without blocking the dev server.
Start-Job {
    for ($i = 0; $i -lt 60; $i++) {
        try { Invoke-WebRequest 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1 | Out-Null; break }
        catch { Start-Sleep -Milliseconds 500 }
    }
    Start-Process 'http://localhost:3000'
} | Out-Null

Write-Host 'Starting app at http://localhost:3000 (Ctrl+C to stop)' -ForegroundColor Green
npm run dev
