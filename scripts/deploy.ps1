# Deploy automatico Gare Appalto su Ionos.
# Configura scripts/deploy.config.ps1 (copia da deploy.config.example).
#
# Primo deploy su VPS nuovo:
#   .\scripts\deploy.ps1 -FirstSetup
#
# Deploy successivi (push git + build + pubblica):
#   .\scripts\deploy.ps1
#
# Solo pubblica (senza git push):
#   .\scripts\deploy.ps1 -SkipGitPush

param(
    [switch]$SkipGitPush,
    [switch]$ApplyOnly,
    [switch]$FrontendOnly,
    [switch]$FirstSetup,
    [string]$GitBranch = "main"
)

& (Join-Path $PSScriptRoot "deploy-to-vps.ps1") @PSBoundParameters
