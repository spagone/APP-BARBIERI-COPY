@echo off
setlocal

if "%~1"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-online.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-online.ps1" -Message "%*"
)

endlocal
