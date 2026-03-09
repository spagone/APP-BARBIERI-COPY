@echo off
setlocal

set "ROOT=%~dp0"
set "SERVER_DIR=%ROOT%server"
set "MOBILE_DIR=%ROOT%barber-app"
set "ADMIN_DIR=%ROOT%admin-dashboard"

if not exist "%SERVER_DIR%\package.json" (
  echo [ERRORE] Non trovo "%SERVER_DIR%\package.json"
  exit /b 1
)

if not exist "%MOBILE_DIR%\package.json" (
  echo [ERRORE] Non trovo "%MOBILE_DIR%\package.json"
  exit /b 1
)

if not exist "%ADMIN_DIR%" (
  echo [ERRORE] Non trovo la cartella "%ADMIN_DIR%"
  exit /b 1
)

echo Avvio backend in una nuova finestra...
start "MyBarber API" cmd /k "cd /d ""%SERVER_DIR%"" && npm run dev"

echo Avvio app mobile Expo in una nuova finestra...
start "MyBarber Mobile" cmd /k "cd /d ""%MOBILE_DIR%"" && npx expo start -c"

echo Avvio dashboard admin in una nuova finestra...
start "MyBarber Admin" cmd /k "cd /d ""%ADMIN_DIR%"" && npx serve -l 4173"

echo.
echo Fatto. Se non parte, controlla i log nelle tre finestre.
echo Admin dashboard: http://localhost:4173
endlocal
