#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# --- activate venv if present (works locally and in GitHub Actions) ---
if [[ -f "../../.venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  . ../../.venv/bin/activate
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set"; exit 2
fi

TARGET_SEASONS="${INJURY_SEASONS:-}"

echo "[injuries] Python: $(python -V)"
echo "[injuries] Pip list (head):"
python - <<'PY' || true
import pkgutil, sys
mods = sorted(m.name for m in pkgutil.iter_modules())
for m in ("pandas","requests","nfl_data_py","pyarrow","numpy"):
    print(m, "installed" if m in mods else "MISSING")
PY

echo "[injuries] Attempting nfl_data_py for seasons: '${TARGET_SEASONS:-auto}'"
set +e
python fetch_injuries.py
CODE=$?
set -e

NEED_FALLBACK=0
if [[ $CODE -ne 0 ]]; then
  echo "[injuries] nfl_data_py failed with code $CODE — will fallback to ESPN"
  NEED_FALLBACK=1
else
  if [[ -n "$TARGET_SEASONS" ]]; then
    MAX_OK=$(python - <<'PY'
import os, pandas as pd
try:
    target = os.getenv("INJURY_SEASONS","")
    mx = max(int(s.strip()) for s in target.split(",") if s.strip())
    df = pd.read_csv("nfl_injuries.csv")
    print(1 if (df['season']==mx).any() else 0)
except Exception:
    print(0)
PY
)
    if [[ "$MAX_OK" == "0" ]]; then
      echo "[injuries] nfl_data_py missing latest season — falling back to ESPN"
      NEED_FALLBACK=1
    fi
  fi
fi

if [[ "$NEED_FALLBACK" -eq 1 ]]; then
  echo "[injuries] Using ESPN fallback..."
  python fetch_injuries_espn_fallback.py
fi

echo "[injuries] Upserting to Supabase..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f upsert_injuries.sql
echo "[injuries] Done."
