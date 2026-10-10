<#
.SYNOPSIS
  SiteGuard one-command demo launcher for Windows (Stage I).
.DESCRIPTION
  .\demo.ps1           -> plays the tuned demo clip (violation -> escalation story)
  .\demo.ps1 -Webcam   -> uses your laptop webcam (device 0) instead
  Ctrl+C in this window stops the worker; the API server window can then be closed.
#>
param([switch]$Webcam)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$Mode = if ($Webcam) { 'webcam' } else { 'clip' }

# --- preflight ------------------------------------------------------------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Error 'node not found. Install Node 18+ first.'; exit 1 }
if (-not (Test-Path 'vision-worker\venv\Scripts\python.exe')) { Write-Error 'vision-worker\venv missing. Follow README "Setup" once, then re-run.'; exit 1 }
if (-not (Test-Path 'server\node_modules')) { Write-Error 'server\node_modules missing. Run "npm install" in server\ once, then re-run.'; exit 1 }

# --- demo clip -------------------------------------------------------------
$Clip = '.tmp\demo-clip.mp4'
$ClipUrl = 'https://cdn.coverr.co/videos/coverr-construction-workers-454/1080p.mp4'
if (($Mode -eq 'clip') -and (-not (Test-Path $Clip))) {
  Write-Host '[demo] downloading royalty-free demo clip (Coverr, commercial-use)...'
  New-Item -ItemType Directory -Force -Path '.tmp' | Out-Null
  Invoke-WebRequest -Uri $ClipUrl -OutFile $Clip
}

# --- start server -----------------------------------------------------------
# (launched via cmd so PORT is set on Windows PowerShell 5.1 as well as 7+)
Write-Host '[demo] starting API server on :3000 ...'
$ServerProc = Start-Process -FilePath 'cmd' -ArgumentList '/c', 'set PORT=3000 && node server\server.js' `
  -WorkingDirectory $PSScriptRoot -WindowStyle Minimized -PassThru
$Up = $false
for ($i = 0; $i -lt 30; $i++) {
  try { if ((Invoke-WebRequest -UseBasicParsing 'http://localhost:3000/api/incidents' -TimeoutSec 2).StatusCode -eq 200) { $Up = $true; break } }
  catch { Start-Sleep -Seconds 1 }
}
if (-not $Up) { Write-Error 'server failed to start.'; Stop-Process -Id $ServerProc.Id -ErrorAction SilentlyContinue; exit 1 }

# --- start worker (foreground; Ctrl+C stops it) ------------------------------
Write-Host "[demo] starting vision worker ($Mode) ..."
Start-Process 'http://localhost:3000'
try {
  Push-Location 'vision-worker'
  if ($Webcam) { & '.\venv\Scripts\python.exe' worker.py --webcam --conf 0.35 --skip 8 --imgsz 480 }
  else { & '.\venv\Scripts\python.exe' worker.py --video '..\.tmp\demo-clip.mp4' --conf 0.35 --skip 8 --imgsz 480 }
} finally {
  Pop-Location
  Write-Host ''
  Write-Host '[demo] worker stopped. Stopping API server...'
  Stop-Process -Id $ServerProc.Id -ErrorAction SilentlyContinue
}
