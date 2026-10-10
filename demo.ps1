<#
.SYNOPSIS
  SiteGuard one-command demo launcher for Windows (Stage I).
.DESCRIPTION
  .\demo.ps1                       -> plays the tuned demo clip
  .\demo.ps1 -Webcam               -> uses the laptop webcam (device 0)
  .\demo.ps1 -ResetData            -> archives prior evidence, then starts clean
  Options may be combined. Ctrl+C stops the worker and API server process trees.
#>
param(
  [switch]$Webcam,
  [switch]$ResetData
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$TempDir = Join-Path $PSScriptRoot '.tmp'
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

$Mode = if ($Webcam) { 'webcam' } else { 'clip' }
$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCommand) { Write-Error 'node not found. Install Node 18+ first.'; exit 1 }
$NodeExe = $NodeCommand.Source
$PythonExe = Join-Path $PSScriptRoot 'vision-worker\venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $PythonExe -PathType Leaf)) { Write-Error 'vision-worker\venv missing. Follow README "Setup" once, then re-run.'; exit 1 }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'server\node_modules') -PathType Container)) { Write-Error 'server\node_modules missing. Run "npm install" in server\ once, then re-run.'; exit 1 }

# Bind a dual-stack listener just as Node does by default. Never silently attach
# to an existing or stale process that happens to answer on port 3000.
$PortAvailable = $true
$PortProbe = $null
try {
  $PortProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::IPv6Any, 3000)
  $PortProbe.Server.DualMode = $true
  $PortProbe.Server.ExclusiveAddressUse = $true
  $PortProbe.Start()
} catch {
  $PortAvailable = $false
} finally {
  if ($null -ne $PortProbe) { $PortProbe.Stop() }
}
if (-not $PortAvailable) {
  Write-Host 'Port 3000 is already occupied. Stop the existing/stale server, then re-run SiteGuard.' -ForegroundColor Red
  exit 1
}

# --- demo clip ---------------------------------------------------------------
$Clip = Join-Path $TempDir 'demo-clip.mp4'
$ClipUrl = 'https://cdn.coverr.co/videos/coverr-construction-workers-454/1080p.mp4'
if (($Mode -eq 'clip') -and (-not (Test-Path -LiteralPath $Clip -PathType Leaf))) {
  Write-Host '[demo] downloading sample demo clip from Coverr (third-party terms apply)...'
  Invoke-WebRequest -Uri $ClipUrl -OutFile $Clip
}

# --- optional clean recording state -----------------------------------------
if ($ResetData) {
  $Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $BackupDir = Join-Path $TempDir "data-backup-$Stamp"
  if (Test-Path -LiteralPath $BackupDir) { $BackupDir = "$BackupDir-$PID" }
  New-Item -ItemType Directory -Path $BackupDir | Out-Null

  $IncidentsPath = Join-Path $PSScriptRoot 'data\incidents.json'
  $SnapshotsPath = Join-Path $PSScriptRoot 'data\snapshots'
  if (Test-Path -LiteralPath $IncidentsPath -PathType Leaf) {
    Move-Item -LiteralPath $IncidentsPath -Destination (Join-Path $BackupDir 'incidents.json')
  }
  if (Test-Path -LiteralPath $SnapshotsPath) {
    Move-Item -LiteralPath $SnapshotsPath -Destination (Join-Path $BackupDir 'snapshots')
  }
  Write-Host "[demo] prior incident data archived to: $BackupDir"
}

function Stop-ProcessTree {
  param(
    [System.Diagnostics.Process]$Process,
    [string]$Label
  )
  if ($null -eq $Process) { return }
  try {
    $Process.Refresh()
    if ($Process.HasExited) { return }
  } catch { return }

  Write-Host "[demo] stopping $Label process tree..."
  & taskkill.exe /PID "$($Process.Id)" /T /F *> $null
  if ($LASTEXITCODE -ne 0) {
    Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
  }
}

$ServerProc = $null
$WorkerProc = $null
$ScriptExitCode = 0
$ServerStdout = Join-Path $TempDir 'server.log'
$ServerStderr = Join-Path $TempDir 'server-error.log'

try {
  # --- start server ----------------------------------------------------------
  Write-Host '[demo] starting API server on :3000 ...'
  $SavedPort = [Environment]::GetEnvironmentVariable('PORT', 'Process')
  $SavedAlert = [Environment]::GetEnvironmentVariable('ESCALATE_ALERT_FRAMES', 'Process')
  $SavedCritical = [Environment]::GetEnvironmentVariable('ESCALATE_CRITICAL_FRAMES', 'Process')
  try {
    $env:PORT = '3000'
    if ($Mode -eq 'clip') {
      $env:ESCALATE_ALERT_FRAMES = '10'
      $env:ESCALATE_CRITICAL_FRAMES = '15'
      Write-Host '[demo] clip policy: alert=10, critical=15 processed violation frames (demo-only).'
    }
    $ServerProc = Start-Process -FilePath $NodeExe -ArgumentList 'server\server.js' `
      -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput $ServerStdout -RedirectStandardError $ServerStderr
  } finally {
    [Environment]::SetEnvironmentVariable('PORT', $SavedPort, 'Process')
    [Environment]::SetEnvironmentVariable('ESCALATE_ALERT_FRAMES', $SavedAlert, 'Process')
    [Environment]::SetEnvironmentVariable('ESCALATE_CRITICAL_FRAMES', $SavedCritical, 'Process')
  }

  $Up = $false
  for ($i = 0; $i -lt 60; $i++) {
    $ServerProc.Refresh()
    if ($ServerProc.HasExited) { break }
    try {
      $Response = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3000/api/incidents' -TimeoutSec 2
      if ($Response.StatusCode -eq 200) { $Up = $true; break }
    } catch { }
    Start-Sleep -Milliseconds 500
  }
  if (-not $Up) {
    if (Test-Path -LiteralPath $ServerStdout) { Get-Content -LiteralPath $ServerStdout -Tail 20 | Write-Host }
    if (Test-Path -LiteralPath $ServerStderr) { Get-Content -LiteralPath $ServerStderr -Tail 20 | Write-Host }
    throw 'API server failed to start; see .tmp\server.log and .tmp\server-error.log.'
  }

  # --- start worker ----------------------------------------------------------
  Write-Host "[demo] starting vision worker ($Mode) ..."
  $WorkerArgs = @('worker.py')
  if ($Webcam) {
    $WorkerArgs += @('--webcam', '--conf', '0.35', '--skip', '8', '--imgsz', '480')
  } else {
    $WorkerArgs += @('--video', '..\.tmp\demo-clip.mp4', '--conf', '0.35', '--skip', '8', '--imgsz', '480')
  }
  $Url = 'http://localhost:3000'
  Write-Host "[demo] dashboard: $Url"
  try { Start-Process $Url } catch { Write-Warning "Could not open the browser automatically. Open $Url manually." }

  # Run the native worker in this console. Windows PowerShell can lose the
  # exit code of a long-lived process launched through Start-Process, while a
  # direct native invocation reliably sets LASTEXITCODE and receives Ctrl+C.
  Push-Location (Join-Path $PSScriptRoot 'vision-worker')
  try {
    & $PythonExe @WorkerArgs
    $WorkerExitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  if ($null -eq $WorkerExitCode) { throw 'Vision worker exit status was unavailable.' }
  if ($WorkerExitCode -ne 0) { throw "Vision worker exited with status $WorkerExitCode." }
  $ServerProc.Refresh()
  if ($ServerProc.HasExited) { throw 'API server stopped while the vision worker was running.' }

  Write-Host ''
  Write-Host '[demo] vision worker finished. The dashboard remains live for review, acknowledgement, and CSV export.'
  Write-Host '[demo] Press Ctrl+C in this window when you are done.'
  while ($true) {
    Start-Sleep -Seconds 1
    $ServerProc.Refresh()
    if ($ServerProc.HasExited) { throw 'API server stopped unexpectedly; see .tmp\server.log and .tmp\server-error.log.' }
  }
} catch {
  Write-Host "[demo] error: $($_.Exception.Message)" -ForegroundColor Red
  $ScriptExitCode = 1
} finally {
  Stop-ProcessTree -Process $WorkerProc -Label 'vision worker'
  Stop-ProcessTree -Process $ServerProc -Label 'API server'
}

exit $ScriptExitCode
