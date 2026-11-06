#!/usr/bin/env bash
# Share a single Config Layer build across Vaults without sharing Vault settings.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_SOURCE="${CONFIG_LAYER_DIR:-$HOME/workspace/obsidian-config-layer}"
CONFIG_DEST="$ROOT/.obsidian/plugins/config-layer"

if [[ ! -d "$CONFIG_SOURCE" ]]; then
  if [[ -e "$CONFIG_SOURCE" || -L "$CONFIG_SOURCE" ]]; then
    echo "Config Layer path is not a directory: $CONFIG_SOURCE" >&2
    exit 1
  fi
  command -v git >/dev/null || { echo 'git is required to clone Config Layer' >&2; exit 1; }
  mkdir -p "$(dirname "$CONFIG_SOURCE")"
  echo "Cloning Config Layer to $CONFIG_SOURCE ..."
  git clone https://github.com/takashit16833/obsidian-config-layer.git "$CONFIG_SOURCE"
fi

# Use absolute link targets even when CONFIG_LAYER_DIR was supplied relatively.
CONFIG_SOURCE="$(cd "$CONFIG_SOURCE" && pwd -P)"
if [[ ! -f "$CONFIG_SOURCE/manifest.json" ]]; then
  echo "Config Layer manifest.json not found: $CONFIG_SOURCE" >&2
  exit 1
fi
if [[ ! -f "$CONFIG_SOURCE/main.js" ]]; then
  command -v npm >/dev/null || { echo 'npm is required to build Config Layer' >&2; exit 1; }
  echo 'Building Config Layer once in the central checkout ...'
  (cd "$CONFIG_SOURCE" && npm install --no-package-lock && npm run build)
fi
if [[ ! -f "$CONFIG_SOURCE/main.js" ]]; then
  echo "Config Layer main.js not found after build: $CONFIG_SOURCE" >&2
  exit 1
fi

if [[ -L "$CONFIG_DEST" ]]; then
  echo "Refusing to use a symlinked plugin directory: $CONFIG_DEST" >&2
  exit 1
fi
mkdir -p "$CONFIG_DEST"

# Check all existing links before changing anything. Never replace another
# link or change the Vault-local data.json.
for asset in manifest.json main.js styles.css; do
  target="$CONFIG_DEST/$asset"
  source="$CONFIG_SOURCE/$asset"
  if [[ -L "$target" && "$(readlink "$target")" != "$source" ]]; then
    echo "Refusing to replace an unrelated symlink: $target" >&2
    exit 1
  fi
  if [[ -e "$target" && ! -f "$target" ]]; then
    echo "Refusing to replace a non-file: $target" >&2
    exit 1
  fi
done

backup_dir=''
for asset in manifest.json main.js styles.css; do
  target="$CONFIG_DEST/$asset"
  source="$CONFIG_SOURCE/$asset"
  if [[ -L "$target" ]]; then
    if [[ ! -f "$source" ]]; then
      # A link created by this installer, whose optional source disappeared.
      rm "$target"
    fi
  elif [[ -e "$target" ]]; then
    # Preserve the old copy from the previous submodule-based installer.
    if [[ -z "$backup_dir" ]]; then
      backup_dir="$(mktemp -d "$CONFIG_DEST/.pre-symlink-backup.XXXXXX")"
    fi
    mv "$target" "$backup_dir/$asset"
  fi
  if [[ -f "$source" && ! -L "$target" ]]; then
    ln -s "$source" "$target"
  fi
done

if [[ -n "$backup_dir" ]]; then
  echo "Previous plugin files backed up in: $backup_dir"
fi
echo "Config Layer linked from: $CONFIG_SOURCE"
echo 'Vault-local data.json was not modified.'
