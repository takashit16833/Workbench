$ErrorActionPreference = 'Stop'

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$source = if ($env:CONFIG_LAYER_DIR) {
    $env:CONFIG_LAYER_DIR
} else {
    Join-Path (Join-Path $HOME 'workspace') 'obsidian-config-layer'
}
$source = [IO.Path]::GetFullPath($source)
$dest = Join-Path $root '.obsidian\plugins\config-layer'

if (-not (Test-Path -LiteralPath $source -PathType Container)) {
    if (Test-Path -LiteralPath $source) {
        throw "Config Layer path is not a directory: $source"
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'git is required to clone Config Layer.'
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $source) -Force | Out-Null
    & git clone https://github.com/takashit16833/obsidian-config-layer.git $source
    if ($LASTEXITCODE -ne 0) {
        throw "Could not clone Config Layer (git exit code: $LASTEXITCODE)."
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $source 'manifest.json') -PathType Leaf)) {
    throw "Config Layer manifest.json not found: $source"
}
if (-not (Test-Path -LiteralPath (Join-Path $source 'main.js') -PathType Leaf)) {
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'Node.js and npm are required to build Config Layer.'
    }
    Push-Location $source
    try {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed (exit code: $LASTEXITCODE)." }
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed (exit code: $LASTEXITCODE)." }
    } finally {
        Pop-Location
    }
}
if (-not (Test-Path -LiteralPath (Join-Path $source 'main.js') -PathType Leaf)) {
    throw "Config Layer main.js not found after build: $source"
}

$existingDir = Get-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue
if ($null -ne $existingDir -and ($existingDir.LinkType -or -not $existingDir.PSIsContainer)) {
    throw "Refusing to use a linked or non-directory plugin folder: $dest"
}
New-Item -ItemType Directory -Path $dest -Force | Out-Null

$assets = @('manifest.json', 'main.js', 'styles.css')
$needsLink = $false

# Refuse unrelated links and directories before changing any existing plugin file.
foreach ($asset in $assets) {
    $target = Join-Path $dest $asset
    $assetSource = Join-Path $source $asset
    $existing = Get-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue

    if ($null -eq $existing) {
        if (Test-Path -LiteralPath $assetSource -PathType Leaf) { $needsLink = $true }
        continue
    }

    if ($existing.LinkType -eq 'SymbolicLink') {
        $linkTarget = @($existing.Target)[0]
        if (-not [IO.Path]::IsPathRooted($linkTarget)) {
            $linkTarget = Join-Path $dest $linkTarget
        }
        $linkTarget = [IO.Path]::GetFullPath($linkTarget)
        if (-not [string]::Equals($linkTarget, $assetSource, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to replace an unrelated symlink: $target"
        }
    } elseif ($existing.PSIsContainer -or $existing.LinkType) {
        throw "Refusing to replace a non-file: $target"
    } elseif (Test-Path -LiteralPath $assetSource -PathType Leaf) {
        $needsLink = $true
    }
}

# Check link privileges before moving older plugin copies into a backup folder.
if ($needsLink) {
    $token = [guid]::NewGuid().ToString('N')
    $probeSource = Join-Path $dest ".link-probe-$token.tmp"
    $probeLink = Join-Path $dest ".link-probe-$token.lnk"
    try {
        [IO.File]::WriteAllText($probeSource, 'probe')
        New-Item -ItemType SymbolicLink -Path $probeLink -Target $probeSource -ErrorAction Stop | Out-Null
    } catch {
        throw 'Cannot create symbolic links. Enable Windows Developer Mode or run PowerShell as administrator.'
    } finally {
        if (Test-Path -LiteralPath $probeLink) {
            Remove-Item -LiteralPath $probeLink -Force
        }
        if (Test-Path -LiteralPath $probeSource) {
            Remove-Item -LiteralPath $probeSource -Force
        }
    }
}

$backupDir = $null
foreach ($asset in $assets) {
    $target = Join-Path $dest $asset
    $assetSource = Join-Path $source $asset
    $existing = Get-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue

    if ($null -ne $existing -and $existing.LinkType -eq 'SymbolicLink') {
        if (-not (Test-Path -LiteralPath $assetSource -PathType Leaf)) {
            Remove-Item -LiteralPath $target -Force
        }
        continue
    }
    if ($null -ne $existing) {
        if ($null -eq $backupDir) {
            $backupDir = Join-Path $dest ('.pre-symlink-backup.' + [guid]::NewGuid().ToString('N'))
            New-Item -ItemType Directory -Path $backupDir | Out-Null
        }
        Move-Item -LiteralPath $target -Destination (Join-Path $backupDir $asset)
    }
    if (Test-Path -LiteralPath $assetSource -PathType Leaf) {
        New-Item -ItemType SymbolicLink -Path $target -Target $assetSource -ErrorAction Stop | Out-Null
    }
}

if ($null -ne $backupDir) {
    Write-Host "Previous plugin files backed up in: $backupDir"
}
Write-Host "Config Layer linked from: $source"
Write-Host 'Vault-local data.json was not modified.'
