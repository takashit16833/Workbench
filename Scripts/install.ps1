$ErrorActionPreference = 'Stop'

Write-Host '[1/2] Linking the centrally managed Config Layer...'
& (Join-Path $PSScriptRoot 'install-config-layer.ps1')

Write-Host '[2/2] Installing Workbench community plugins...'
& (Join-Path $PSScriptRoot 'install-plugins.ps1')

Write-Host 'Workbench setup complete. Restart Obsidian or reload the vault, then follow ONBOARDING.md.'
