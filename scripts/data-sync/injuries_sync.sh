#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set"; exit 2
fi

TARGET_SEASONS="${INJURY_SEASONS:-}"

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
  # if INJURY_SEASONS provided, ensure the max season exists in CSV
  if [[ -n "$TARGET_SEASONS" ]]; then
    MAX_SEASON=$(python - <<'PY'
import os, pandas as pd
target = os.getenv("INJURY_SEASONS","")
mx = max(int(s.strip()) for s in target.split(",") if s.strip()) if target else None
df = pd.read_csv("nfl_injuries.csv")
print(1 if (mx is not None and (df['season']==mx).any()) else 0)
PY
)
    if [[ "$MAX_SEASON" == "0" ]]; then
      echo "[injuries] nfl_data_py did not include the requested latest season — falling back to ESPN"
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
