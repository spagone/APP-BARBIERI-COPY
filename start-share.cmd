@echo off
setlocal

if "%~1"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-share.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-share.ps1" -ApiBaseUrl "%~1"
)

endlocal
