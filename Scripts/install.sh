#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_SOURCE="$ROOT/Vendor/obsidian-config-layer"
CONFIG_DEST="$ROOT/.obsidian/plugins/config-layer"
COMMUNITY="$ROOT/.obsidian/community-plugins.json"

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
}

require_command git
require_command npm
require_command python3

printf '\n[1/4] Initializing submodules...\n'
git -C "$ROOT" submodule update --init --recursive

printf '\n[2/4] Building Config Layer...\n'
(
  cd "$CONFIG_SOURCE"
  npm install --no-package-lock
  npm run build
)

if [[ ! -f "$CONFIG_SOURCE/manifest.json" || ! -f "$CONFIG_SOURCE/main.js" ]]; then
  echo "Config Layer build did not produce manifest.json and main.js" >&2
  exit 1
fi

printf '\n[3/4] Installing Config Layer into the vault...\n'
mkdir -p "$CONFIG_DEST"
cp "$CONFIG_SOURCE/manifest.json" "$CONFIG_DEST/manifest.json"
cp "$CONFIG_SOURCE/main.js" "$CONFIG_DEST/main.js"

if [[ -f "$CONFIG_SOURCE/styles.css" ]]; then
  cp "$CONFIG_SOURCE/styles.css" "$CONFIG_DEST/styles.css"
else
  rm -f "$CONFIG_DEST/styles.css"
fi

printf '\n[4/4] Installing Workbench community plugins...\n'
bash "$ROOT/Scripts/install-plugins.sh"

python3 - "$COMMUNITY" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
try:
    current = json.loads(path.read_text()) if path.exists() else []
except Exception:
    current = []

if "config-layer" not in current:
    current.append("config-layer")

path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n")
PY

printf '\nWorkbench setup complete.\n'
echo "Restart Obsidian or reload the vault, then follow ONBOARDING.md."
