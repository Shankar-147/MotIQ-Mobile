# Stops the servers started by run-demo.ps1 and closes their windows.

$pidFile = Join-Path $PSScriptRoot '.logs\windows.pids'

# 1. The console windows the launcher opened, together with everything they
#    started (npm, node, the dev servers).
if (Test-Path $pidFile) {
  foreach ($line in Get-Content $pidFile) {
    if ($line -match '^\d+$') {
      taskkill /PID $line /T /F 2>$null | Out-Null
    }
  }
  Set-Content -Path $pidFile -Value ''
}

# 1b. Any other window of ours, found by the title the launcher gave it
#     (this also catches windows left over from an older run).
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match "WindowTitle = 'MotIQ" } |
  ForEach-Object { taskkill /PID $_.ProcessId /T /F 2>$null | Out-Null }

# 2. Anything still listening on the demo ports.
foreach ($port in @(3001, 5173, 8081)) {
  $owners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $owners) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "Stopped the process on port $port"
    } catch {
      Write-Host "Could not stop the process on port $port" -ForegroundColor Yellow
    }
  }
}

Write-Host 'MotIQ demo stopped.' -ForegroundColor Green
