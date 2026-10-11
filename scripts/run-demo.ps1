# Starts the whole MotIQ demo on Windows and opens a browser window for each
# kind of user. Run it with run-demo.bat, or from PowerShell:
#
#   powershell -ExecutionPolicy Bypass -File scripts\run-demo.ps1
#
# Switches:
#   -NoBrowser    start everything but do not open the browser windows
#   -Minimized    keep the server windows minimized
#   -SkipInstall  do not run npm install even if node_modules is missing
#   -SkipSeed     do not add the demo data

param(
  [switch]$NoBrowser,
  [switch]$Minimized,
  [switch]$SkipInstall,
  [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'

$root   = Split-Path -Parent $PSScriptRoot
$api    = Join-Path $root 'apps\api'
$web    = Join-Path $root 'apps\web'
$mobile = Join-Path $root 'apps\mobile'
$logs   = Join-Path $PSScriptRoot '.logs'
$apiLog = Join-Path $logs 'api.log'

function Say($text, $color = 'Cyan') { Write-Host $text -ForegroundColor $color }

# True once something answers on the address, even with an error status.
function Test-Web($url) {
  try {
    Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null
    return $true
  } catch {
    return ($null -ne $_.Exception.Response)
  }
}

function Wait-Web($url, $name, $seconds) {
  $until = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $until) {
    if (Test-Web $url) { Say "  $name is up" 'Green'; return }
    Start-Sleep -Seconds 2
  }
  throw "$name did not start within $seconds seconds. Look at its window for the error."
}

$pidFile = Join-Path $logs 'windows.pids'

# Opens a console window that runs one server. Its process id is written to a
# file so stop-demo can close exactly these windows later.
function Start-ServerWindow($title, $folder, $command) {
  $inner = "`$host.UI.RawUI.WindowTitle = '$title'; $command"
  $style = 'Normal'
  if ($Minimized) { $style = 'Minimized' }
  $window = Start-Process -FilePath 'powershell.exe' -WorkingDirectory $folder -WindowStyle $style `
    -ArgumentList @('-NoExit', '-NoProfile', '-Command', $inner) -PassThru
  Add-Content -Path $pidFile -Value $window.Id
}

# ---------------------------------------------------------------- checks
Say 'MotIQ demo launcher' 'White'
Say '1. Checking the machine'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js was not found. Install Node 20 or newer from nodejs.org and try again.'
}

$envFile = Join-Path $api '.env'
if (-not (Test-Path $envFile)) {
  throw "apps\api\.env is missing. Copy apps\api\.env.example to apps\api\.env and set DATABASE_URL and JWT_SECRET."
}

# Load the .env values so the migration and seed steps can see them.
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $value = $Matches[2].Trim().Trim('"')
    [Environment]::SetEnvironmentVariable($Matches[1], $value, 'Process')
  }
}

try {
  $client = New-Object System.Net.Sockets.TcpClient
  $client.Connect('127.0.0.1', 5432)
  $client.Close()
  Say '  PostgreSQL is running' 'Green'
} catch {
  throw 'PostgreSQL does not answer on port 5432. Start the PostgreSQL service and try again.'
}

# ------------------------------------------------------------- install
if (-not $SkipInstall) {
  foreach ($app in @($api, $web, $mobile)) {
    if (-not (Test-Path (Join-Path $app 'node_modules'))) {
      Say "2. Installing packages in $(Split-Path -Leaf $app) (first run only)"
      Push-Location $app
      npm install
      if ($LASTEXITCODE -ne 0) { Pop-Location; throw "npm install failed in $app" }
      Pop-Location
    }
  }
}

# ------------------------------------------------------------ database
Say '3. Preparing the database'
Push-Location $api
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'prisma migrate deploy failed. Is DATABASE_URL correct?' }
npx prisma generate | Out-Null
if (-not $SkipSeed) {
  npm run seed
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'The seed step failed.' }
}
Pop-Location

# ------------------------------------------------------------- servers
Say '4. Starting the servers (each opens its own window)'
New-Item -ItemType Directory -Force $logs | Out-Null

# If an earlier copy is still running, stop it so the ports and log file are free.
& (Join-Path $PSScriptRoot 'stop-demo.ps1') | Out-Null
Start-Sleep -Seconds 2
Set-Content -Path $apiLog -Value ''
Set-Content -Path $pidFile -Value ''

# The API output is shown in its window and also copied to a plain text log,
# which the "OTP codes" window reads.
Start-ServerWindow 'MotIQ API' $api "npm run start:dev 2>&1 | ForEach-Object { Add-Content -Path '$apiLog' -Value `$_ -Encoding UTF8; `$_ }"
Start-ServerWindow 'MotIQ Web' $web 'npm run dev -- --port 5173 --strictPort'
Start-ServerWindow 'MotIQ Mobile' $mobile 'npx expo start --web --port 8081'
Start-ServerWindow 'MotIQ OTP codes' $logs "Write-Host 'Sign-in codes appear here as people ask for them:' -ForegroundColor Cyan; Get-Content -Path '$apiLog' -Wait -Tail 0 | Where-Object { `$_ -match 'OTP for' }"

Wait-Web 'http://localhost:3001/api/v1/areas' 'API (port 3001)' 180
Wait-Web 'http://localhost:5173' 'Web console (port 5173)' 120
Wait-Web 'http://localhost:8081' 'Mobile app (port 8081)' 180

# The first visit to the mobile app compiles it, which takes a minute or two.
# Do that now so nobody is staring at a blank page.
Say '5. Warming up the mobile app (about a minute the first time)'
try {
  $html = (Invoke-WebRequest -Uri 'http://localhost:8081' -UseBasicParsing -TimeoutSec 60).Content
  $script = [regex]::Match($html, '<script[^>]+src="([^"]+)"')
  if ($script.Success) {
    Invoke-WebRequest -Uri ('http://localhost:8081' + $script.Groups[1].Value) -UseBasicParsing -TimeoutSec 600 | Out-Null
  }
  Say '  Mobile app is ready' 'Green'
} catch {
  Say '  Could not pre-compile the mobile app; the first page load will be slow.' 'Yellow'
}

# ------------------------------------------------------------- browser
if (-not $NoBrowser) {
  Say '6. Opening a window for each user'
  $candidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
  )
  $browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

  $windows = @(
    @{ Name = 'admin';    Url = 'http://localhost:5173/login'; Size = '1000,720'; Position = '0,0' },
    @{ Name = 'customer'; Url = 'http://localhost:8081';       Size = '410,780';  Position = '760,30' },
    @{ Name = 'provider'; Url = 'http://localhost:8081';       Size = '410,780';  Position = '1010,60' }
  )

  if ($browser) {
    foreach ($w in $windows) {
      # A separate profile folder per window, so each one has its own
      # signed-in session and the three people do not log each other out.
      $profile = Join-Path $env:TEMP ("motiq-demo\" + $w.Name)
      Start-Process -FilePath $browser -ArgumentList @(
        "--user-data-dir=$profile",
        '--no-first-run',
        '--no-default-browser-check',
        "--window-size=$($w.Size)",
        "--window-position=$($w.Position)",
        '--new-window',
        $w.Url
      ) | Out-Null
      Start-Sleep -Milliseconds 800
    }
  } else {
    Say '  No Edge or Chrome found. Open these yourself in separate browser profiles:' 'Yellow'
    Start-Process 'http://localhost:5173/login'
  }
}

# ---------------------------------------------------------- cheat sheet
Write-Host ''
Say '=====================================================================' 'White'
Say ' MotIQ is running' 'White'
Say '=====================================================================' 'White'
Write-Host ' Web console (admin)    http://localhost:5173'
Write-Host ' Mobile app             http://localhost:8081'
Write-Host ' API                    http://localhost:3001/api/v1'
Write-Host ''
Write-Host ' Who to sign in as (type the number, then the code from the'
Write-Host ' "MotIQ OTP codes" window):'
Write-Host ''
Write-Host '   Admin (web console)          99999 00000'
Write-Host '   Provider, online             98460 00001   Asha Auto Care'
Write-Host '   Provider, online             98460 00002   Bala Tow Service'
Write-Host '   Provider, waiting approval   98460 00003   Kiran Mobile Mechanics'
Write-Host '   Customer with history        98450 00011   Asha Kumar'
Write-Host '   New customer or provider     any other 10 digit number'
Write-Host ''
Write-Host ' Each browser window is a separate profile, so all three can stay'
Write-Host ' signed in at the same time. To stop everything run stop-demo.bat.'
Write-Host ''
