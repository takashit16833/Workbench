#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCK="$ROOT/Plugins.lock"
PLUGIN_DIR="$ROOT/.obsidian/plugins"
COMMUNITY="$ROOT/.obsidian/community-plugins.json"

read_version() {
  local id="$1"
  awk -F= -v id="$id" '$1 == id { print $2 }' "$LOCK"
}

install_plugin() {
  local id="$1"
  local repo="$2"
  local version
  version="$(read_version "$id")"
  if [[ -z "$version" ]]; then
    echo "Missing version for $id in Plugins.lock" >&2
    exit 1
  fi

  local dest="$PLUGIN_DIR/$id"
  mkdir -p "$dest"
  echo "Installing $id $version..."
  for asset in manifest.json main.js styles.css; do
    local url="https://github.com/$repo/releases/download/$version/$asset"
    if ! curl -fsSL "$url" -o "$dest/$asset"; then
      if [[ "$asset" == "styles.css" ]]; then
        rm -f "$dest/$asset"
      else
        echo "Failed to download $url" >&2
        exit 1
      fi
    fi
  done
}

mkdir -p "$PLUGIN_DIR"
install_plugin tasknotes callumalpass/tasknotes
install_plugin fileclass mdelobelle/fileclass

python3 - "$COMMUNITY" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
try:
    current = json.loads(path.read_text()) if path.exists() else []
except Exception:
    current = []
for plugin_id in ["tasknotes", "fileclass"]:
    if plugin_id not in current:
        current.append(plugin_id)
path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n")
PY

echo
echo "Installed TaskNotes and Fileclass."
echo "Restart Obsidian or reload the vault, then follow ONBOARDING.md."
