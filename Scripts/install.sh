#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMMUNITY="$ROOT/.obsidian/community-plugins.json"

printf '\n[1/2] Linking the centrally managed Config Layer...\n'
bash "$ROOT/Scripts/install-config-layer.sh"

printf '\n[2/2] Installing Workbench community plugins...\n'
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
