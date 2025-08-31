#!/usr/bin/env bash
set -euo pipefail

# --- auto-venv / ensure requests ---
if [[ -d ".venv" ]]; then
  # shellcheck disable=SC1091
  . .venv/bin/activate
fi
python3 - <<'PY' || true
try:
    import requests  # noqa: F401
except Exception:
    raise SystemExit(1)
PY
if [[ "${PIPESTATUS[0]}" != "0" ]]; then
  echo "Installing 'requests'…"
  python3 -m pip install --upgrade pip >/dev/null 2>&1 || true
  python3 -m pip install requests >/dev/null
fi
# -----------------------------------

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  exit 1
fi

CSV="/tmp/ncaaf_injuries.csv"
CSV_CFBD="/tmp/ncaaf_injuries_cfbd.csv"
CSV_ESPN="/tmp/ncaaf_injuries_espn.csv"
rm -f "$CSV" "$CSV_CFBD" "$CSV_ESPN" 2>/dev/null || true

# 1) CFBD primary
if python3 scripts/data-sync/fetch_ncaaf_injuries_cfbd.py; then
  # move to a named path so we can union with ESPN
  if [[ -f "/tmp/ncaaf_injuries.csv" ]]; then
    mv /tmp/ncaaf_injuries.csv "$CSV_CFBD"
  fi
else
  echo "WARN: CFBD injuries fetch failed (exception)."
fi

# Count data rows (exclude header) for CFBD
CFBD_ROWS=0
if [[ -f "$CSV_CFBD" ]]; then
  CFBD_ROWS=$(($(wc -l < "$CSV_CFBD")-1))
  if (( CFBD_ROWS < 0 )); then CFBD_ROWS=0; fi
fi

# 2) ESPN fallback if CFBD empty; otherwise also fetch to UNION (PK will dedupe)
NEED_ESPN=0
if (( CFBD_ROWS == 0 )); then
  NEED_ESPN=1
else
  # We still fetch ESPN to capture additional rows ESPN might have
  NEED_ESPN=1
fi

if (( NEED_ESPN == 1 )); then
  if python3 scripts/data-sync/fetch_ncaaf_injuries_espn.py; then
    if [[ -f "/tmp/ncaaf_injuries.csv" ]]; then
      mv /tmp/ncaaf_injuries.csv "$CSV_ESPN"
    fi
  else
    echo "WARN: ESPN fallback failed as well."
  fi
fi

# Count ESPN rows
ESPN_ROWS=0
if [[ -f "$CSV_ESPN" ]]; then
  ESPN_ROWS=$(($(wc -l < "$CSV_ESPN")-1))
  if (( ESPN_ROWS < 0 )); then ESPN_ROWS=0; fi
fi

# 3) Choose CSV to load: union if both non-empty; else whichever exists; else stub
if (( CFBD_ROWS > 0 && ESPN_ROWS > 0 )); then
  # union: write header once, then append both payloads (PK in DB dedupes)
  head -n 1 "$CSV_CFBD" > "$CSV"
  tail -n +2 "$CSV_CFBD" >> "$CSV"
  tail -n +2 "$CSV_ESPN" >> "$CSV"
  echo "INFO: Unioned injuries: CFBD=$CFBD_ROWS, ESPN=$ESPN_ROWS -> $(($(wc -l < "$CSV")-1)) rows"
elif (( CFBD_ROWS > 0 )); then
  mv "$CSV_CFBD" "$CSV"
  echo "INFO: Using CFBD injuries: $CFBD_ROWS rows"
elif (( ESPN_ROWS > 0 )); then
  mv "$CSV_ESPN" "$CSV"
  echo "INFO: Using ESPN injuries: $ESPN_ROWS rows"
else
  echo "INFO: No injuries from CFBD/ESPN; creating empty CSV to keep pipeline green."
  python3 scripts/data-sync/fetch_ncaaf_injuries_stub.py
  mv /tmp/ncaaf_injuries.csv "$CSV"
fi

# 4) Ensure schema
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/data-sync/ncaaf_injuries_schema.sql

# 5) Stage & load
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "drop table if exists public._stg_ncaaf_injuries; create table public._stg_ncaaf_injuries (like public.ncaaf_injuries);"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\copy public._stg_ncaaf_injuries(
  season,week,team,player_id,player_name,position,
  report_status,practice_status,designation,body_part,description,source,date_updated
) from '${CSV}' csv header null ''"

# 6) Upsert (PK prevents dupes; UPDATE on conflict)
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/data-sync/upsert_ncaaf_injuries.sql

# 7) Quick check
psql "$SUPABASE_DB_URL" -c "select season, week, count(*) rows from public.ncaaf_injuries group by season, week order by season desc, week desc limit 10;"
