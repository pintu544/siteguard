@echo off
REM SiteGuard one-command demo launcher for Windows (Stage I).
REM   demo.bat           -> plays the tuned demo clip (violation -> escalation story)
REM   demo.bat --webcam  -> uses your laptop webcam (device 0) instead
REM Press Ctrl+C in this window to stop the worker, then close the
REM "SiteGuard API server" window to stop the server.
setlocal
cd /d "%~dp0"

set MODE=clip
if "%~1"=="--webcam" set MODE=webcam

REM --- preflight ------------------------------------------------------------
where node >nul 2>nul || ( echo node not found. Install Node 18+ first. & exit /b 1 )
if not exist "vision-worker\venv\Scripts\python.exe" ( echo vision-worker\venv missing. Follow README "Setup" once, then re-run. & exit /b 1 )
if not exist "server\node_modules" ( echo server\node_modules missing. Run "npm install" in server\ once, then re-run. & exit /b 1 )

REM --- demo clip (tuned segment source) --------------------------------------
set CLIP=.tmp\demo-clip.mp4
set CLIP_URL=https://cdn.coverr.co/videos/coverr-construction-workers-454/1080p.mp4
if "%MODE%"=="clip" if not exist "%CLIP%" (
  echo [demo] downloading royalty-free demo clip ^(Coverr, commercial-use^)...
  if not exist ".tmp" mkdir ".tmp"
  curl -fsSL -o "%CLIP%" "%CLIP_URL%" || ( echo download failed. & exit /b 1 )
)

REM --- start server -----------------------------------------------------------
echo [demo] starting API server on :3000 ...
start "SiteGuard API server" /min cmd /c "set PORT=3000 && node server\server.js"
set UP=0
for /l %%i in (1,1,30) do (
  curl -fs -o nul http://localhost:3000/api/incidents 2>nul && ( set UP=1 & goto :server_up )
  timeout /t 1 /nobreak >nul
)
:server_up
if "%UP%"=="0" ( echo server failed to start. & exit /b 1 )

REM --- start worker (foreground; Ctrl+C stops it) ------------------------------
echo [demo] starting vision worker (%MODE%) ...
start http://localhost:3000
cd vision-worker
if "%MODE%"=="webcam" (
  venv\Scripts\python.exe worker.py --webcam --conf 0.35 --skip 8 --imgsz 480
) else (
  venv\Scripts\python.exe worker.py --video ..\.tmp\demo-clip.mp4 --conf 0.35 --skip 8 --imgsz 480
)
cd /d "%~dp0"
echo.
echo [demo] worker stopped. Close the "SiteGuard API server" window to stop the server.
