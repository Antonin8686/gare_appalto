# Deploy dal PC Windows: build locale + upload immagini Docker sul VPS.
# Prerequisiti: Docker Desktop, OpenSSH (ssh/scp).
#
# Uso:
#   .\scripts\deploy-to-vps.ps1
#   .\scripts\deploy-to-vps.ps1 -SkipGitPush
#   .\scripts\deploy-to-vps.ps1 -ApplyOnly

param(
    [string]$ServerIP = "",
    [string]$User = "root",
    [string]$RemotePath = "/var/www/gare-appalto",
    [string]$ProjectName = "gareappalto",
    [switch]$SkipGitPush,
    [switch]$ApplyOnly
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

function Invoke-Ssh {
    param([string]$Command)
    ssh $sshTarget $Command
    if ($LASTEXITCODE -ne 0) { throw "SSH fallito" }
}

function Invoke-RemoteScp {
    param([string]$LocalPath, [string]$RemoteDest)
    scp $LocalPath "${sshTarget}:${RemoteDest}"
    if ($LASTEXITCODE -ne 0) { throw "SCP fallito per $LocalPath" }
}

Write-Host "=== Gare Appalto -> VPS ===" -ForegroundColor Cyan
Write-Host "Server: $sshTarget"
Write-Host "Path:   $RemotePath"
Write-Host ""

if ($ApplyOnly) {
    $remoteScript = "/tmp/gare-prod-apply-update.sh"
    Invoke-RemoteScp -LocalPath (Join-Path $PSScriptRoot "prod-apply-update.sh") -RemoteDest $remoteScript
    Invoke-Ssh -Command "export COMPOSE_PROJECT_NAME=$ProjectName; export REMOTE_PATH=$RemotePath; sh $remoteScript /tmp/gareappalto-backend.tar /tmp/gareappalto-frontend.tar"
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

$backendTar = Join-Path $env:TEMP "gareappalto-backend.tar"
$frontendTar = Join-Path $env:TEMP "gareappalto-frontend.tar"

Write-Host "-> docker save" -ForegroundColor Yellow
docker save --output $backendTar $backendImage
docker save --output $frontendTar $frontendImage

Write-Host "-> scp immagini" -ForegroundColor Yellow
Invoke-RemoteScp -LocalPath $backendTar -RemoteDest "/tmp/gareappalto-backend.tar"
Invoke-RemoteScp -LocalPath $frontendTar -RemoteDest "/tmp/gareappalto-frontend.tar"

Write-Host "-> git sync sul server" -ForegroundColor Yellow
Invoke-Ssh -Command "mkdir -p $RemotePath && cd $RemotePath && (test -d .git || git clone https://github.com/Antonin8686/gare_appalto.git .) && git fetch origin main && git reset --hard origin/main"

Invoke-RemoteScp -LocalPath (Join-Path $PSScriptRoot "prod-apply-update.sh") -RemoteDest "/tmp/gare-prod-apply-update.sh"
Invoke-Ssh -Command "export COMPOSE_PROJECT_NAME=$ProjectName; export REMOTE_PATH=$RemotePath; sh /tmp/gare-prod-apply-update.sh /tmp/gareappalto-backend.tar /tmp/gareappalto-frontend.tar"

Remove-Item $backendTar, $frontendTar -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Deploy completato." -ForegroundColor Green
Write-Host "Sito: $SiteUrl"
