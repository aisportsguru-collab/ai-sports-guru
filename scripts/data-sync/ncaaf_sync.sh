#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root regardless of CWD
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
if [[ -z "${SEASONS:-}" ]]; then
  SEASONS="$(date +%Y)"
fi

echo "==> NCAAF sync starting"
echo "    Seasons: ${SEASONS}"
echo "    DB: ${SUPABASE_DB_URL%%@*}@…"

echo "==> Python version"
python3 --version

echo "==> Fetching stats via CFBD (seasons=${SEASONS})"
export SEASONS
if ! python3 "${ROOT_DIR}/scripts/data-sync/fetch_ncaaf_cfbd.py"; then
  echo "WARN: CFBD fetch failed; running fallback" >&2
  python3 "${ROOT_DIR}/scripts/data-sync/scrape_ncaaf_espn_current.py"
fi

TEAMS_CSV="/tmp/ncaaf_teams.csv"
PLAYERS_CSV="/tmp/ncaaf_players.csv"
if [[ ! -s "$TEAMS_CSV" || ! -s "$PLAYERS_CSV" ]]; then
  echo "ERROR: Missing CSVs at /tmp."; exit 1
fi
wc -l "$TEAMS_CSV" "$PLAYERS_CSV" || true

echo "==> Ensuring base schema exists"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/scripts/data-sync/ncaaf_schema.sql"

echo "==> Creating staging tables"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "drop table if exists public._stg_ncaaf_teams;   create table public._stg_ncaaf_teams   (like public.ncaaf_teams);"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "drop table if exists public._stg_ncaaf_players; create table public._stg_ncaaf_players (like public.ncaaf_players);"

echo "==> Loading staging via \\copy"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\
\\copy public._stg_ncaaf_teams( \
  season,team,team_id,conference,division,games, \
  points_for,points_against, \
  yards_offense,yards_passing_offense,yards_rushing_offense,first_downs_offense,turnovers_lost, \
  yards_defense_allowed,yards_passing_defense_allowed,yards_rushing_defense_allowed, \
  sacks_defense,interceptions_defense,takeaways, \
  third_down_offense_pct,third_down_defense_pct, \
  red_zone_offense_pct,red_zone_defense_pct, \
  time_of_possession_sec \
) from '${TEAMS_CSV}' csv header null ''"

psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\
\\copy public._stg_ncaaf_players( \
  season,team,player_id,player_name,position,class,games, \
  pass_att,pass_cmp,pass_yds,pass_td,pass_int,pass_sacks,pass_ypa,pass_rating, \
  rush_att,rush_yds,rush_td,rush_ypa, \
  rec_rec,rec_tgt,rec_yds,rec_td,rec_ypr, \
  def_tackles_total,def_tackles_solo,def_tfl,def_sacks,def_pd,def_int,def_ff,def_fr, \
  kick_fgm,kick_fga,kick_xpm,kick_xpa,punt_avg,punt_ct, \
  team_id \
) from '${PLAYERS_CSV}' csv header null ''"

echo "==> Upserting into public tables"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/scripts/data-sync/upsert_ncaaf.sql"

echo "==> Row counts by season"
psql "$SUPABASE_DB_URL" -c "select season, count(*) as team_rows    from public.ncaaf_teams    group by season order by season;"
psql "$SUPABASE_DB_URL" -c "select season, count(*) as player_rows  from public.ncaaf_players group by season order by season;"

echo "==> NCAAF sync complete."
