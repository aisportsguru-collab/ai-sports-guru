#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  exit 1
fi

# build CSV (stub; replace with real fetcher later)
python3 scripts/data-sync/fetch_ncaaf_injuries_stub.py

CSV="/tmp/ncaaf_injuries.csv"
if [[ ! -s "$CSV" ]]; then
  echo "No injuries rows (stub). Proceeding with empty CSV to keep pipeline green."
fi

# schema (safe to re-run)
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/data-sync/ncaaf_injuries_schema.sql

# create staging and load
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "drop table if exists public._stg_ncaaf_injuries; create table public._stg_ncaaf_injuries (like public.ncaaf_injuries);"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\copy public._stg_ncaaf_injuries(
  season,week,team,player_id,player_name,position,
  report_status,practice_status,designation,body_part,description,source,date_updated
) from '${CSV}' csv header null ''"

# upsert
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/data-sync/upsert_ncaaf_injuries.sql

# quick check
psql "$SUPABASE_DB_URL" -c "select season, week, count(*) rows from public.ncaaf_injuries group by season, week order by season desc, week desc limit 10;"
