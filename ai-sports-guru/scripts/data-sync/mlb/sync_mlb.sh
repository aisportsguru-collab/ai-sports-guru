#!/usr/bin/env bash
set -euo pipefail
echo "[MLB] seasons ${SEASONS:-unset}"

python scripts/data-sync/mlb/fetch_mlb_stats_primary.py

# optional fallback only touches injuries file
python scripts/data-sync/mlb/scrape_mlb_current_espn.py || echo "[MLB] ESPN fallback skipped"

psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/data-sync/mlb/upsert_mlb.sql
