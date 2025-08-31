#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root no matter the CWD
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# --- auto-venv / ensure requests ---
if [[ -d "${ROOT_DIR}/.venv" ]]; then
  # shellcheck disable=SC1091
  . "${ROOT_DIR}/.venv/bin/activate"
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

# Final CSV we will load
CSV="/tmp/ncaaf_injuries.csv"
# Intermediate sources (for union)
CSV_CFBD="/tmp/ncaaf_injuries_cfbd.csv"
CSV_ESPN="/tmp/ncaaf_injuries_espn.csv"
rm -f "$CSV" "$CSV_CFBD" "$CSV_ESPN" 2>/dev/null || true

# 1) CFBD primary
if python3 "${ROOT_DIR}/scripts/data-sync/fetch_ncaaf_injuries_cfbd.py"; then
  # fetcher writes to /tmp/ncaaf_injuries.csv; rename to CFBD source if present
  if [[ -f "/tmp/ncaaf_injuries.csv" ]]; then
    # Only move if source != destination
    if [[ "/tmp/ncaaf_injuries.csv" != "$CSV_CFBD" ]]; then
      mv /tmp/ncaaf_injuries.csv "$CSV_CFBD"
    fi
  fi
else
  echo "WARN: CFBD injuries fetch failed (exception)."
fi

# Count data rows (exclude header)
rows_of () { [[ -f "$1" ]] && awk 'NR>1{c++} END{print c+0}' "$1" || echo 0; }
CFBD_ROWS="$(rows_of "$CSV_CFBD")"

# 2) ESPN fallback (always try; PK will dedupe on upsert)
if python3 "${ROOT_DIR}/scripts/data-sync/fetch_ncaaf_injuries_espn.py"; then
  if [[ -f "/tmp/ncaaf_injuries.csv" ]]; then
    if [[ "/tmp/ncaaf_injuries.csv" != "$CSV_ESPN" ]]; then
      mv /tmp/ncaaf_injuries.csv "$CSV_ESPN"
    fi
  fi
else
  echo "WARN: ESPN fallback failed as well."
fi
ESPN_ROWS="$(rows_of "$CSV_ESPN")"

# 3) Build final CSV
if (( CFBD_ROWS > 0 && ESPN_ROWS > 0 )); then
  # union
  head -n 1 "$CSV_CFBD" > "$CSV"
  tail -n +2 "$CSV_CFBD" >> "$CSV"
  tail -n +2 "$CSV_ESPN" >> "$CSV"
  echo "INFO: Unioned injuries: CFBD=${CFBD_ROWS}, ESPN=${ESPN_ROWS} -> $(awk 'NR>1{c++} END{print c+0}' "$CSV") rows"
elif (( CFBD_ROWS > 0 )); then
  cp "$CSV_CFBD" "$CSV"
  echo "INFO: Using CFBD injuries: $CFBD_ROWS rows"
elif (( ESPN_ROWS > 0 )); then
  cp "$CSV_ESPN" "$CSV"
  echo "INFO: Using ESPN injuries: $ESPN_ROWS rows"
else
  echo "INFO: No injuries from CFBD/ESPN; creating empty CSV to keep pipeline green."
  python3 "${ROOT_DIR}/scripts/data-sync/fetch_ncaaf_injuries_stub.py"
  # stub already writes to /tmp/ncaaf_injuries.csv; ensure it's at $CSV
  if [[ "/tmp/ncaaf_injuries.csv" != "$CSV" ]]; then
    cp /tmp/ncaaf_injuries.csv "$CSV"
  fi
fi

# 4) Ensure schema
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/scripts/data-sync/ncaaf_injuries_schema.sql"

# 5) Stage & load
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "drop table if exists public._stg_ncaaf_injuries; create table public._stg_ncaaf_injuries (like public.ncaaf_injuries);"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\copy public._stg_ncaaf_injuries(
  season,week,team,player_id,player_name,position,
  report_status,practice_status,designation,body_part,description,source,date_updated
) from '${CSV}' csv header null ''"

# 6) Upsert (PK prevents dupes; UPDATE on conflict)
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/scripts/data-sync/upsert_ncaaf_injuries.sql"

# 7) Quick check
psql "$SUPABASE_DB_URL" -c "select season, week, count(*) rows from public.ncaaf_injuries group by season, week order by season desc, week desc limit 10;"
