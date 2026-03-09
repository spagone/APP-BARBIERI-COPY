param(
  [Parameter(Position = 0)]
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
  throw "Impossibile leggere il branch git corrente."
}

git add -A

$status = (git status --porcelain).Trim()
if ([string]::IsNullOrWhiteSpace($status)) {
  Write-Host "Nessuna modifica da pubblicare."
  exit 0
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

git commit -m $Message
git push origin $branch

Write-Host ""
Write-Host "Push completato su '$branch'."
Write-Host "Se Render/Vercel hanno Auto-Deploy attivo, l'update online parte ora."
