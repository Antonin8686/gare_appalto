# Deploy dal PC Windows: build locale + upload immagini Docker sul VPS.
# Prerequisiti: Docker Desktop, OpenSSH (ssh/scp).
#
# Uso:
#   .\scripts\deploy-to-vps.ps1
#   .\scripts\deploy-to-vps.ps1 -SkipGitPush
#   .\scripts\deploy-to-vps.ps1 -ApplyOnly
#   .\scripts\deploy-to-vps.ps1 -FrontendOnly   # solo frontend (backend gia sul VPS)

param(
    [string]$ServerIP = "",
    [string]$User = "root",
    [string]$RemotePath = "/var/www/gare-appalto",
    [string]$ProjectName = "gareappalto",
    [switch]$SkipGitPush,
    [switch]$ApplyOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$configPath = Join-Path $PSScriptRoot "deploy.config.ps1"
if (Test-Path $configPath) {
    . $configPath
    if ($ServerIP -eq "" -and $VpsHost) { $ServerIP = $VpsHost }
    if ($User -eq "root" -and $VpsUser) { $User = $VpsUser }
    if ($RemotePath -eq "/var/www/gare-appalto" -and $VpsPath) { $RemotePath = $VpsPath }
    if ($ProjectName -eq "gareappalto" -and $ComposeProjectName) { $ProjectName = $ComposeProjectName }
}

if ($ServerIP -eq "") {
    Write-Host "ERRORE: specifica -ServerIP 82.165.176.194 oppure crea scripts/deploy.config.ps1" -ForegroundColor Red
    exit 1
}

if (-not $SiteUrl) {
    $SiteUrl = "http://gare.fontanebianche.today:8080"
}

$sshTarget = "${User}@${ServerIP}"
$backendImage = "${ProjectName}-backend:latest"
$frontendImage = "${ProjectName}-frontend:latest"
$backendTar = Join-Path $env:TEMP "gareappalto-backend.tar"
$frontendTar = Join-Path $env:TEMP "gareappalto-frontend.tar"

function Invoke-Ssh {
    param([string]$Command)
    ssh $sshTarget $Command
    if ($LASTEXITCODE -ne 0) { throw "SSH fallito: $Command" }
}

function Invoke-RemoteScp {
    param([string]$LocalPath, [string]$RemoteDest)
    $mb = [math]::Round((Get-Item $LocalPath).Length / 1MB, 1)
    Write-Host "   upload $mb MB -> $RemoteDest" -ForegroundColor DarkGray
    scp -C $LocalPath "${sshTarget}:${RemoteDest}"
    if ($LASTEXITCODE -ne 0) { throw "SCP fallito per $LocalPath" }
}

function Invoke-VpsPreUploadCleanup {
    Write-Host "-> pulizia /tmp sul VPS (libera spazio prima dell'upload)" -ForegroundColor Yellow
    $cmd = @"
df -h / /tmp; docker builder prune -af 2>/dev/null || true; rm -f /tmp/gareappalto-frontend.tar 2>/dev/null; ls -lh /tmp/gareappalto-*.tar 2>/dev/null || true
"@
    Invoke-Ssh -Command $cmd
}

function Invoke-RemoteApply {
    Invoke-RemoteScp -LocalPath (Join-Path $PSScriptRoot "prod-apply-update.sh") -RemoteDest "/tmp/gare-prod-apply-update.sh"
    Invoke-Ssh -Command "export COMPOSE_PROJECT_NAME=$ProjectName; export REMOTE_PATH=$RemotePath; sh /tmp/gare-prod-apply-update.sh /tmp/gareappalto-backend.tar /tmp/gareappalto-frontend.tar"
}

Write-Host "=== Gare Appalto -> VPS ===" -ForegroundColor Cyan
Write-Host "Server: $sshTarget"
Write-Host "Path:   $RemotePath"
Write-Host ""

if ($ApplyOnly) {
    Invoke-RemoteApply
    Write-Host "Deploy completato: $SiteUrl" -ForegroundColor Green
    exit 0
}

if ($FrontendOnly) {
    Write-Host "-> docker save frontend" -ForegroundColor Yellow
    docker save --output $frontendTar $frontendImage
    Invoke-VpsPreUploadCleanup
    Write-Host "-> scp frontend" -ForegroundColor Yellow
    Invoke-RemoteScp -LocalPath $frontendTar -RemoteDest "/tmp/gareappalto-frontend.tar"
    Invoke-RemoteApply
    Remove-Item $frontendTar -Force -ErrorAction SilentlyContinue
    Write-Host "Deploy completato: $SiteUrl" -ForegroundColor Green
    exit 0
}

if (-not $SkipGitPush) {
    Write-Host "-> git push origin main" -ForegroundColor Yellow
    git push origin main
}

$env:COMPOSE_PROJECT_NAME = $ProjectName

Write-Host "-> docker compose build" -ForegroundColor Yellow
docker compose -f docker-compose.yml -f docker-compose.prod.yml build backend frontend
if ($LASTEXITCODE -ne 0) { throw "Build fallita" }

Invoke-VpsPreUploadCleanup

Write-Host "-> docker save + upload backend" -ForegroundColor Yellow
docker save --output $backendTar $backendImage
Invoke-RemoteScp -LocalPath $backendTar -RemoteDest "/tmp/gareappalto-backend.tar"

Write-Host "-> carica backend sul VPS e libera /tmp" -ForegroundColor Yellow
Invoke-Ssh -Command "docker load -i /tmp/gareappalto-backend.tar && rm -f /tmp/gareappalto-backend.tar && df -h /"

Write-Host "-> docker save + upload frontend" -ForegroundColor Yellow
docker save --output $frontendTar $frontendImage
Invoke-RemoteScp -LocalPath $frontendTar -RemoteDest "/tmp/gareappalto-frontend.tar"

Write-Host "-> git sync sul server" -ForegroundColor Yellow
Invoke-Ssh -Command "mkdir -p $RemotePath && cd $RemotePath && (test -d .git || git clone https://github.com/Antonin8686/gare_appalto.git .) && git fetch origin main && git reset --hard origin/main"

Invoke-RemoteApply

Remove-Item $backendTar, $frontendTar -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Deploy completato." -ForegroundColor Green
Write-Host "Sito: $SiteUrl"
