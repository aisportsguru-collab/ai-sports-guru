#!/usr/bin/env bash
set -euo pipefail

if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
. .venv/bin/activate
python -m pip install --upgrade pip >/dev/null
python -c "import requests" 2>/dev/null || python -m pip install requests >/dev/null

echo "Bootstrap complete. Venv: .venv with 'requests' installed."
