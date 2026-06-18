# Esegue vps-cleanup-orphans.sh sul VPS via SSH
param(
    [switch]$RemoveSwap
)

$ErrorActionPreference = "Stop"
$gareRoot = Split-Path -Parent $PSScriptRoot
$fbConfig = Join-Path (Split-Path -Parent $gareRoot) "Fontane Bianche\fontane-bianche-today\scripts\deploy.config.ps1"

if (-not (Test-Path $fbConfig)) {
    Write-Host "ERRORE: manca $fbConfig (credenziali SSH Fontane)" -ForegroundColor Red
    exit 1
}
. $fbConfig

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Install-Module -Name Posh-SSH -Scope CurrentUser -Force -AllowClobber
}
Import-Module Posh-SSH -ErrorAction Stop

$sec = ConvertTo-SecureString $IonosSshPassword -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($IonosUser, $sec)
$session = New-SSHSession -ComputerName $IonosHost -Credential $cred -AcceptKey -Force

$localScript = Join-Path $PSScriptRoot "vps-cleanup-orphans.sh"
$content = [System.IO.File]::ReadAllText($localScript) -replace "`r`n", "`n" -replace "`r", "`n"
$tempPath = Join-Path $env:TEMP "vps-cleanup-orphans.sh"
[System.IO.File]::WriteAllText($tempPath, $content, [System.Text.UTF8Encoding]::new($false))

Set-SCPItem -ComputerName $IonosHost -Credential $cred -Path $tempPath -Destination "/tmp" -AcceptKey -Force
Remove-Item $tempPath -Force -ErrorAction SilentlyContinue

$flag = if ($RemoveSwap) { " --remove-swap" } else { "" }
$cmd = "sed -i 's/\r$//' /tmp/vps-cleanup-orphans.sh; sh /tmp/vps-cleanup-orphans.sh$flag; rm -f /tmp/vps-cleanup-orphans.sh"

Write-Host "Eseguo pulizia su $IonosHost..." -ForegroundColor Cyan
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command $cmd -TimeOut 300
$result.Output | ForEach-Object { Write-Output $_ }
if ($result.Error) { $result.Error | ForEach-Object { Write-Output $_ } }
if ($result.ExitStatus -ne 0) { exit $result.ExitStatus }

Remove-SSHSession -SessionId $session.SessionId | Out-Null
