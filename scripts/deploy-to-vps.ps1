# Deploy automatico dal PC Windows -> VPS Ionos.
# Config: scripts/deploy.config.ps1 (gitignored, vedi deploy.config.example)
#
#   .\scripts\deploy.ps1 -FirstSetup    # primo deploy VPS nuovo
#   .\scripts\deploy.ps1                # aggiornamento normale

param(
    [string]$ServerIP = "",
    [string]$User = "root",
    [string]$RemotePath = "/var/www/gare-appalto",
    [string]$ProjectName = "gareappalto",
    [switch]$SkipGitPush,
    [switch]$ApplyOnly,
    [switch]$FrontendOnly,
    [switch]$FirstSetup
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
    if (-not $IonosSshPassword -and $VpsSshPassword) { $IonosSshPassword = $VpsSshPassword }
}

if ($ServerIP -eq "") {
    Write-Host "ERRORE: compila scripts/deploy.config.ps1 (copia da deploy.config.example)" -ForegroundColor Red
    exit 1
}

if (-not $AppDomain) { $AppDomain = $ServerIP }
if (-not $SiteUrl) {
    if ($DedicatedVps) { $SiteUrl = "http://${AppDomain}" } else { $SiteUrl = "http://${AppDomain}:8080" }
}

$sshTarget = "${User}@${ServerIP}"
$backendImage = "${ProjectName}-backend:latest"
$frontendImage = "${ProjectName}-frontend:latest"
$backendTar = Join-Path $env:TEMP "gareappalto-backend.tar"
$frontendTar = Join-Path $env:TEMP "gareappalto-frontend.tar"
$script:SshCredential = $null
$script:SshSessionId = $null

$composeArgs = @("-f", "docker-compose.yml", "-f", "docker-compose.prod.yml")
if ($DedicatedVps) { $composeArgs += @("-f", "docker-compose.prod.dedicated.yml") }

function Ensure-PoshSshModule {
    if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
        Write-Host "-> installo Posh-SSH (una tantum)" -ForegroundColor Yellow
        Install-Module -Name Posh-SSH -Scope CurrentUser -Force -AllowClobber -ErrorAction Stop
    }
    Import-Module Posh-SSH -ErrorAction Stop
}

function Initialize-RemoteAuth {
    if (-not $IonosSshPassword) { return }
    Ensure-PoshSshModule
    $secure = ConvertTo-SecureString $IonosSshPassword -AsPlainText -Force
    $script:SshCredential = New-Object System.Management.Automation.PSCredential($User, $secure)
    $session = New-SSHSession -ComputerName $ServerIP -Credential $script:SshCredential -AcceptKey -Force -ErrorAction Stop
    $script:SshSessionId = $session.SessionId
    Write-Host "SSH: login automatico (deploy.config.ps1)" -ForegroundColor DarkGreen
}

function Close-RemoteSession {
    if ($null -ne $script:SshSessionId) {
        Remove-SSHSession -SessionId $script:SshSessionId -ErrorAction SilentlyContinue | Out-Null
        $script:SshSessionId = $null
    }
}

function Invoke-Ssh {
    param([string]$Command)
    if ($null -ne $script:SshSessionId) {
        $r = Invoke-SSHCommand -SessionId $script:SshSessionId -Command $Command -TimeOut 3600
        if ($r.Output) { $r.Output | ForEach-Object { Write-Host $_ } }
        if ($r.ExitStatus -ne 0) { throw "SSH fallito (exit $($r.ExitStatus)): $Command`n$($r.Error)" }
        return
    }
    ssh $sshTarget $Command
    if ($LASTEXITCODE -ne 0) { throw "SSH fallito: $Command" }
}

function Invoke-RemoteScp {
    param([string]$LocalPath, [string]$RemoteDest)
    $mb = [math]::Round((Get-Item $LocalPath).Length / 1MB, 1)
    Write-Host "   upload $mb MB -> $RemoteDest" -ForegroundColor DarkGray
    if ($null -ne $script:SshCredential) {
        $dir = ($RemoteDest -replace '\\', '/')
        $name = Split-Path $dir -Leaf
        $parent = $dir.Substring(0, $dir.Length - $name.Length).TrimEnd('/')
        if ($parent -eq '') { $parent = '/' }
        Set-SCPItem -ComputerName $ServerIP -Credential $script:SshCredential -Path $LocalPath -Destination $parent -AcceptKey -Force -ErrorAction Stop
        $uploaded = "$parent/$([IO.Path]::GetFileName($LocalPath))"
        if ($uploaded -ne $dir) { Invoke-Ssh -Command "mv '$uploaded' '$dir'" }
        return
    }
    scp -C $LocalPath "${sshTarget}:${RemoteDest}"
    if ($LASTEXITCODE -ne 0) { throw "SCP fallito per $LocalPath" }
}

function Invoke-VpsPreUploadCleanup {
    Write-Host "-> pulizia /tmp sul VPS" -ForegroundColor Yellow
    Invoke-Ssh -Command "df -h /; docker builder prune -af 2>/dev/null || true; rm -f /tmp/gareappalto-frontend.tar 2>/dev/null; true"
}

function Send-ShellScript {
    param([string]$LocalPath, [string]$RemoteDest)
    Invoke-RemoteScp -LocalPath $LocalPath -RemoteDest $RemoteDest
}

function Invoke-RemoteApply {
    Send-ShellScript -LocalPath (Join-Path $PSScriptRoot "prod-apply-update.sh") -RemoteDest "/tmp/gare-prod-apply-update.sh"
    $dedicated = if ($DedicatedVps) { "1" } else { "0" }
    $applyCmd = "sed -i 's/\r$//' /tmp/gare-prod-apply-update.sh; " +
        "export COMPOSE_PROJECT_NAME=$ProjectName; export REMOTE_PATH=$RemotePath; " +
        "export APP_DOMAIN=$AppDomain; export VPS_IP=$ServerIP; export DEDICATED_VPS=$dedicated; " +
        "sh /tmp/gare-prod-apply-update.sh /tmp/gareappalto-backend.tar /tmp/gareappalto-frontend.tar"
    Invoke-Ssh -Command $applyCmd
}

function Invoke-FirstSetup {
    Write-Host "-> primo setup VPS Ionos" -ForegroundColor Yellow
    Send-ShellScript -LocalPath (Join-Path $PSScriptRoot "ionos-first-setup.sh") -RemoteDest "/tmp/gare-ionos-first-setup.sh"
    $dedicated = if ($DedicatedVps) { "1" } else { "0" }
    $cmd = "sed -i 's/\r$//' /tmp/gare-ionos-first-setup.sh; " +
        "export REMOTE_PATH=$RemotePath; export APP_DOMAIN=$AppDomain; " +
        "export VPS_IP=$ServerIP; export DEDICATED_VPS=$dedicated; sh /tmp/gare-ionos-first-setup.sh"
    Invoke-Ssh -Command $cmd
}

try {
    Initialize-RemoteAuth

    Write-Host "=== Gare Appalto -> Ionos ===" -ForegroundColor Cyan
    Write-Host "Server: $sshTarget"
    Write-Host "Path:   $RemotePath"
    Write-Host "Sito:   $SiteUrl"
    Write-Host ""

    if ($ApplyOnly) {
        Invoke-RemoteApply
        Write-Host "Deploy completato: $SiteUrl" -ForegroundColor Green
        exit 0
    }

    if ($FrontendOnly) {
        docker save --output $frontendTar $frontendImage
        Invoke-VpsPreUploadCleanup
        Invoke-RemoteScp -LocalPath $frontendTar -RemoteDest "/tmp/gareappalto-frontend.tar"
        Invoke-RemoteApply
        Remove-Item $frontendTar -Force -ErrorAction SilentlyContinue
        Write-Host "Deploy completato: $SiteUrl" -ForegroundColor Green
        exit 0
    }

    if ($FirstSetup) {
        Invoke-FirstSetup
    }

    if (-not $SkipGitPush) {
        Write-Host "-> git push origin main" -ForegroundColor Yellow
        git push origin main
    }

    $env:COMPOSE_PROJECT_NAME = $ProjectName

    Write-Host "-> docker compose build (locale)" -ForegroundColor Yellow
    docker compose @composeArgs build backend frontend
    if ($LASTEXITCODE -ne 0) { throw "Build fallita" }

    Invoke-VpsPreUploadCleanup

    Write-Host "-> upload backend" -ForegroundColor Yellow
    docker save --output $backendTar $backendImage
    Invoke-RemoteScp -LocalPath $backendTar -RemoteDest "/tmp/gareappalto-backend.tar"
    Invoke-Ssh -Command "docker load -i /tmp/gareappalto-backend.tar && rm -f /tmp/gareappalto-backend.tar && df -h /"

    Write-Host "-> upload frontend" -ForegroundColor Yellow
    docker save --output $frontendTar $frontendImage
    Invoke-RemoteScp -LocalPath $frontendTar -RemoteDest "/tmp/gareappalto-frontend.tar"

    Write-Host "-> sync git sul server" -ForegroundColor Yellow
    Invoke-Ssh -Command "mkdir -p $RemotePath && cd $RemotePath && (test -d .git || git clone https://github.com/Antonin8686/gare_appalto.git .) && git fetch origin main && git reset --hard origin/main"

    Invoke-RemoteApply

    Remove-Item $backendTar, $frontendTar -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "Deploy completato." -ForegroundColor Green
    Write-Host "Sito: $SiteUrl"
    Write-Host ""
    Write-Host "Crea admin (sul VPS):" -ForegroundColor Yellow
    Write-Host "  ADMIN_EMAIL=tuo@email.it ADMIN_PASSWORD='...' ./scripts/create-admin.sh"
}
finally {
    Close-RemoteSession
}
