#!/usr/bin/env bash
set -euo pipefail

python scripts/data-sync/mlb/fetch_mlb_injuries_primary.py

if [[ ! -s mlb_injuries.csv ]] || [[ $(wc -l < mlb_injuries.csv) -le 1 ]]; then
  echo "[MLB] primary injuries empty. using ESPN fallback"
  python scripts/data-sync/mlb/fetch_mlb_injuries_espn.py
fi

psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/data-sync/mlb/upsert_mlb_injuries.sql
