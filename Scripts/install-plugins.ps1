$ErrorActionPreference = 'Stop'

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$lock = Join-Path $root 'Plugins.lock'
$pluginDir = Join-Path $root '.obsidian\plugins'
$communityPath = Join-Path $root '.obsidian\community-plugins.json'

$versions = @{}
foreach ($line in (Get-Content -LiteralPath $lock)) {
    if ($line -match '^\s*([a-z0-9-]+)=(\S+)\s*$') {
        $versions[$Matches[1]] = $Matches[2]
    }
}

$plugins = @(
    @{ id = 'tasknotes'; repo = 'callumalpass/tasknotes' }
    @{ id = 'fileclass'; repo = 'mdelobelle/fileclass' }
    @{ id = 'homepage'; repo = 'mirnovov/obsidian-homepage' }
    @{ id = 'obsidian-git'; repo = 'Vinzent03/obsidian-git' }
    @{ id = 'file-explorer-plus'; repo = 'kelszo/obsidian-file-explorer-plus' }
    @{ id = 'pane-relief'; repo = 'pjeby/pane-relief' }
)

New-Item -ItemType Directory -Path $pluginDir -Force | Out-Null

foreach ($plugin in $plugins) {
    $id = $plugin.id
    $version = $versions[$id]
    if (-not $version) {
        throw "Missing version for $id in Plugins.lock"
    }

    $dest = Join-Path $pluginDir $id
    $stage = Join-Path ([IO.Path]::GetTempPath()) ("workbench-plugin-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $stage | Out-Null
    try {
        Write-Host "Installing $id $version..."
        foreach ($asset in @('manifest.json', 'main.js', 'styles.css')) {
            $url = "https://github.com/$($plugin.repo)/releases/download/$version/$asset"
            $outFile = Join-Path $stage $asset
            try {
                Invoke-WebRequest -Uri $url -OutFile $outFile -UseBasicParsing -ErrorAction Stop
            } catch {
                if ($asset -ne 'styles.css') {
                    throw "Failed to download $url : $_"
                }
                Remove-Item -LiteralPath $outFile -Force -ErrorAction SilentlyContinue
            }
        }

        New-Item -ItemType Directory -Path $dest -Force | Out-Null
        foreach ($asset in @('manifest.json', 'main.js', 'styles.css')) {
            $staged = Join-Path $stage $asset
            $installed = Join-Path $dest $asset
            if (Test-Path -LiteralPath $staged -PathType Leaf) {
                Copy-Item -LiteralPath $staged -Destination $installed -Force
            } elseif ($asset -eq 'styles.css' -and (Test-Path -LiteralPath $installed -PathType Leaf)) {
                Remove-Item -LiteralPath $installed -Force
            }
        }
    } finally {
        Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$enabled = @()
if (Test-Path -LiteralPath $communityPath -PathType Leaf) {
    try {
        $parsed = ConvertFrom-Json -InputObject ([IO.File]::ReadAllText($communityPath))
    } catch {
        throw "Invalid community-plugins.json: $_"
    }
    foreach ($id in @($parsed)) {
        if ($null -ne $id) {
            if ($id -isnot [string]) { throw 'community-plugins.json must contain plugin IDs.' }
            $enabled += $id
        }
    }
}

$changed = -not (Test-Path -LiteralPath $communityPath -PathType Leaf)
foreach ($id in @('tasknotes', 'fileclass', 'homepage', 'obsidian-git', 'file-explorer-plus', 'pane-relief', 'config-layer')) {
    if ($enabled -cnotcontains $id) {
        $enabled += $id
        $changed = $true
    }
}
if ($changed) {
    $json = ConvertTo-Json -InputObject $enabled -Depth 5
    [IO.File]::WriteAllText($communityPath, "$json" + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))
}

Write-Host 'Workbench community plugins installed. Existing plugin data.json files were preserved.'
