param(
  [Parameter(Position = 0)]
  [string]$ApiBaseUrl = ""
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $root "server"
$mobileDir = Join-Path $root "barber-app"
$adminDir = Join-Path $root "admin-dashboard"
$mobileEnvFile = Join-Path $mobileDir ".env"
$adminConfigFile = Join-Path $adminDir "config.js"

if (-not (Test-Path (Join-Path $serverDir "package.json"))) {
  Write-Error "[ERRORE] Non trovo '$serverDir\package.json'"
}

if (-not (Test-Path (Join-Path $mobileDir "package.json"))) {
  Write-Error "[ERRORE] Non trovo '$mobileDir\package.json'"
}

if (-not (Test-Path $adminDir)) {
  Write-Error "[ERRORE] Non trovo la cartella '$adminDir'"
}

function Get-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key
  )

  if (-not (Test-Path $FilePath)) {
    return ""
  }

  $line = Get-Content $FilePath | Where-Object { $_ -match "^$([Regex]::Escape($Key))=" } | Select-Object -First 1
  if (-not $line) {
    return ""
  }

  return ($line -replace "^$([Regex]::Escape($Key))=", "").Trim()
}

function Set-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key,
    [string]$Value
  )

  $line = "$Key=$Value"

  if (-not (Test-Path $FilePath)) {
    Set-Content -Path $FilePath -Value $line
    return
  }

  $lines = Get-Content $FilePath
  $updated = $false

  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^$([Regex]::Escape($Key))=") {
      $lines[$i] = $line
      $updated = $true
      break
    }
  }

  if (-not $updated) {
    $lines += $line
  }

  Set-Content -Path $FilePath -Value $lines
}

function Test-LocalApiUrl {
  param([string]$Url)

  if ([string]::IsNullOrWhiteSpace($Url)) {
    return $false
  }

  try {
    $uri = [Uri]$Url
    $host = $uri.Host.ToLowerInvariant()

    if ($host -eq "localhost" -or $host -eq "127.0.0.1") {
      return $true
    }

    if (
      $host -match "^10\." -or
      $host -match "^192\.168\." -or
      $host -match "^172\.(1[6-9]|2[0-9]|3[0-1])\."
    ) {
      return $true
    }
  } catch {
    return $false
  }

  return $false
}

function Get-ApiBaseFromAdminConfig {
  param([string]$FilePath)

  if (-not (Test-Path $FilePath)) {
    return ""
  }

  $content = Get-Content -Path $FilePath -Raw
  if ([string]::IsNullOrWhiteSpace($content)) {
    return ""
  }

  $match = [Regex]::Match($content, "apiBaseUrl\s*:\s*['""]([^'""]+)['""]")
  if (-not $match.Success) {
    return ""
  }

  return $match.Groups[1].Value.Trim()
}

if (-not [string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
  Set-EnvValue -FilePath $mobileEnvFile -Key "EXPO_PUBLIC_API_BASE_URL" -Value $ApiBaseUrl.Trim()
}

$effectiveApiBaseUrl = Get-EnvValue -FilePath $mobileEnvFile -Key "EXPO_PUBLIC_API_BASE_URL"
$adminApiBaseUrl = Get-ApiBaseFromAdminConfig -FilePath $adminConfigFile

if (
  [string]::IsNullOrWhiteSpace($ApiBaseUrl) -and
  (Test-LocalApiUrl -Url $effectiveApiBaseUrl) -and
  -not [string]::IsNullOrWhiteSpace($adminApiBaseUrl) -and
  -not (Test-LocalApiUrl -Url $adminApiBaseUrl)
) {
  Set-EnvValue -FilePath $mobileEnvFile -Key "EXPO_PUBLIC_API_BASE_URL" -Value $adminApiBaseUrl
  $effectiveApiBaseUrl = $adminApiBaseUrl
  Write-Host "API mobile aggiornata automaticamente da admin-dashboard/config.js"
}

Write-Host "Avvio backend in una nuova finestra..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$serverDir'; npm run dev"

Write-Host "Avvio dashboard admin in una nuova finestra..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$adminDir'; npx --yes serve -l 4173"

Write-Host ""
if ([string]::IsNullOrWhiteSpace($effectiveApiBaseUrl)) {
  Write-Warning "EXPO_PUBLIC_API_BASE_URL non impostata. L'app usera il fallback locale."
} else {
  Write-Host "API mobile attuale: $effectiveApiBaseUrl"
  if (Test-LocalApiUrl -Url $effectiveApiBaseUrl) {
    Write-Warning "L'API e locale/LAN: i soci fuori rete potrebbero non raggiungerla."
  }
}

Write-Host ""
Write-Host "Avvio Expo in tunnel: ti comparira un URL (exp://...) da condividere."
Write-Host "I soci devono usare Expo Go e lo stesso account Expo (se richiesto)."
Write-Host ""

Set-Location -LiteralPath $mobileDir
npx expo start --tunnel -c
