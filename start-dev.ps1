$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $root "server"
$mobileDir = Join-Path $root "barber-app"
$adminDir = Join-Path $root "admin-dashboard"

if (-not (Test-Path (Join-Path $serverDir "package.json"))) {
  Write-Error "[ERRORE] Non trovo '$serverDir\package.json'"
}

if (-not (Test-Path (Join-Path $mobileDir "package.json"))) {
  Write-Error "[ERRORE] Non trovo '$mobileDir\package.json'"
}

if (-not (Test-Path $adminDir)) {
  Write-Error "[ERRORE] Non trovo la cartella '$adminDir'"
}

Write-Host "Avvio backend in una nuova finestra..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$serverDir'; npm run dev"

Write-Host "Avvio app mobile Expo in una nuova finestra..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$mobileDir'; npx expo start -c"

Write-Host "Avvio dashboard admin in una nuova finestra..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$adminDir'; npx serve -l 4173"

Write-Host ""
Write-Host "Fatto. Se non parte, controlla i log nelle tre finestre."
Write-Host "Admin dashboard: http://localhost:4173"
