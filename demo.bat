@echo off
REM SiteGuard Windows wrapper. Lifecycle and cleanup are owned by demo.ps1.
REM   demo.bat                  -> plays the tuned demo clip
REM   demo.bat --webcam         -> uses the laptop webcam (device 0)
REM   demo.bat --reset          -> archives prior evidence, then starts clean
REM Options may be combined. Ctrl+C stops the worker and API server process trees.
setlocal
cd /d "%~dp0"

if not exist ".tmp" mkdir ".tmp"
if errorlevel 1 ( echo Could not create .tmp. & exit /b 1 )

set "PS_ARGS="
:parse_args
if "%~1"=="" goto run_demo
if /i "%~1"=="--webcam" (
  set "PS_ARGS=%PS_ARGS% -Webcam"
  shift
  goto parse_args
)
if /i "%~1"=="--reset" (
  set "PS_ARGS=%PS_ARGS% -ResetData"
  shift
  goto parse_args
)
if /i "%~1"=="-h" goto usage_ok
if /i "%~1"=="--help" goto usage_ok
echo Unknown option: %~1
goto usage_error

:run_demo
where powershell.exe >nul 2>nul
if errorlevel 1 ( echo powershell.exe not found. & exit /b 1 )
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0demo.ps1" %PS_ARGS%
set "DEMO_EXIT=%ERRORLEVEL%"
endlocal & exit /b %DEMO_EXIT%

:usage_ok
echo Usage: demo.bat [--webcam] [--reset]
endlocal & exit /b 0

:usage_error
echo Usage: demo.bat [--webcam] [--reset]
endlocal & exit /b 2
