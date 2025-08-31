#!/usr/bin/env bash
set -euo pipefail

# run from this script's directory
cd "$(dirname "$0")"

# python env is managed by GitHub Actions, but if you run locally you can still use your venv
if [ -d "../../.venv" ]; then
  source ../../.venv/bin/activate
fi

echo "[1/3] Try nfl_data_py (nflfastR) for latest seasons..."
python fetch_nfl_stats.py || echo "fetch_nfl_stats.py failed; continuing"

NEED_2025=0
if ! grep -q '^2025,' nfl_players.csv 2>/dev/null; then
  NEED_2025=1
else
  # if no meaningful 2025 stats yet, enrich via ESPN
  if ! awk -F, 'NR==1{for(i=1;i<=NF;i++) if($i=="pass_yards") c=i; next} $1=="2025" && $c!="" && $c!="0" {f=1; exit} END{exit(f?0:1)}' nfl_players.csv; then
    NEED_2025=1
  fi
fi

if [ "$NEED_2025" -eq 1 ]; then
  echo "[2/3] Building 2025 via ESPN (cumulative stats)..."
  python scrape_nfl_espn_2025.py
fi

echo "[3/3] Upserting into Supabase..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f upsert.sql
echo "Done."
