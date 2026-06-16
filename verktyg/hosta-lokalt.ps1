# hosta-lokalt.ps1 - Bygg appen och hosta den stabilt lokalt.
#
# Kopierar app/dist + server.mjs till %LOCALAPPDATA%\hosrapport-site (utanfor
# OneDrive - synken kan lasa filer och ge sporadiska 404) och startar en
# fristaende node-server som overlever terminalen.
#
# OBS: Filen halls avsiktligt ASCII-ren - Windows PowerShell 5.1 laser
# BOM-losa .ps1 som ANSI och knacker pa svenska tecken.
#
# Anvandning (fran repo-roten eller var som helst):
#   powershell -ExecutionPolicy Bypass -File .\verktyg\hosta-lokalt.ps1
#   ... -HoppaOverBygge   # hosta om befintlig dist utan att bygga
#   ... -Port 9000        # annan port (default 8137)

param(
  [int]$Port = 8137,
  [switch]$HoppaOverBygge
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$mal  = Join-Path $env:LOCALAPPDATA "hosrapport-site"

# 1. Bygg
if (-not $HoppaOverBygge) {
  Push-Location (Join-Path $repo "app")
  try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build misslyckades" }
  } finally { Pop-Location }
}

# 2. Spegla dist + server ut ur OneDrive
New-Item -ItemType Directory -Force $mal | Out-Null
robocopy (Join-Path $repo "app\dist") (Join-Path $mal "dist") /MIR /NJH /NJS /NDL /NFL | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy misslyckades (kod $LASTEXITCODE)" }
$global:LASTEXITCODE = 0
Copy-Item (Join-Path $repo "verktyg\server.mjs") $mal -Force

# 3. Stoppa ev. tidigare server, starta ny fristaende
$pidFil = Join-Path $mal "server.pid"
if (Test-Path $pidFil) {
  try { Stop-Process -Id (Get-Content $pidFil) -Force -ErrorAction Stop } catch {}
}
$node = (Get-Command node).Source
$proc = Start-Process $node -ArgumentList "server.mjs", $Port `
  -WorkingDirectory $mal -WindowStyle Hidden -PassThru
$proc.Id | Set-Content $pidFil

# 4. Verifiera
Start-Sleep -Milliseconds 800
$url = "http://localhost:$Port/hosrapport/"
try {
  $svar = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5
  Write-Host "Servern kor (HTTP $($svar.StatusCode)): $url" -ForegroundColor Green
} catch {
  throw "Servern svarar inte pa $url - kontrollera att port $Port ar ledig. $_"
}
