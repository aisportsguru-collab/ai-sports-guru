#!/usr/bin/env bash
set -euo pipefail

# Usage:
# TEAMS_CSV=~/DeepSearch/teams_2022_2025.csv \
# PLAYERS_CSV=~/DeepSearch/players_2022_2025.csv \
# INJ_CSV=~/DeepSearch/injuries_2022_2025.csv \
# bash scripts/data-sync/deepsearch_load_ncaaf.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"

TEAMS_IN="${TEAMS_CSV:-}"
PLAYERS_IN="${PLAYERS_CSV:-}"
INJ_IN="${INJ_CSV:-}"

# 1) Normalize DeepSearch CSVs to canonical headers
python3 "${ROOT_DIR}/scripts/data-sync/normalize_deepsearch_ncaaf.py" \
  ${TEAMS_IN:+--teams "$TEAMS_IN"} \
  ${PLAYERS_IN:+--players "$PLAYERS_IN"} \
  ${INJ_IN:+--injuries "$INJ_IN"}

# 2) Ensure schema (no-op if exists)
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/scripts/data-sync/ncaaf_schema.sql"

# 3) Stage fresh tables
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "drop table if exists public._stg_ncaaf_teams;   create table public._stg_ncaaf_teams   (like public.ncaaf_teams);"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "drop table if exists public._stg_ncaaf_players; create table public._stg_ncaaf_players (like public.ncaaf_players);"

# 4) \copy canonical CSVs -> staging (only if we created them)
if [[ -f /tmp/ncaaf_teams.csv ]]; then
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\
\copy public._stg_ncaaf_teams( \
  season,team,team_id,conference,division,games, \
  points_for,points_against, \
  yards_offense,yards_passing_offense,yards_rushing_offense,first_downs_offense,turnovers_lost, \
  yards_defense_allowed,yards_passing_defense_allowed,yards_rushing_defense_allowed, \
  sacks_defense,interceptions_defense,takeaways, \
  third_down_offense_pct,third_down_defense_pct, \
  red_zone_offense_pct,red_zone_defense_pct, \
  time_of_possession_sec \
) from '/tmp/ncaaf_teams.csv' csv header null ''"
fi

if [[ -f /tmp/ncaaf_players.csv ]]; then
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\
\copy public._stg_ncaaf_players( \
  season,team,player_id,player_name,position,class,games, \
  pass_att,pass_cmp,pass_yds,pass_td,pass_int,pass_sacks,pass_ypa,pass_rating, \
  rush_att,rush_yds,rush_td,rush_ypa, \
  rec_rec,rec_tgt,rec_yds,rec_td,rec_ypr, \
  def_tackles_total,def_tackles_solo,def_tfl,def_sacks,def_pd,def_int,def_ff,def_fr, \
  kick_fgm,kick_fga,kick_xpm,kick_xpa,punt_avg,punt_ct, \
  team_id \
) from '/tmp/ncaaf_players.csv' csv header null ''"
fi

# 5) Upsert teams/players (dedupe-safe)
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/scripts/data-sync/upsert_ncaaf.sql"

# 6) Injuries (optional)
if [[ -f /tmp/ncaaf_injuries.csv ]]; then
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/scripts/data-sync/ncaaf_injuries_schema.sql"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "drop table if exists public._stg_ncaaf_injuries; create table public._stg_ncaaf_injuries (like public.ncaaf_injuries);"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\
  \copy public._stg_ncaaf_injuries( \
    season,week,team,player_id,player_name,position, \
    report_status,practice_status,designation,body_part,description,source,date_updated \
  ) from '/tmp/ncaaf_injuries.csv' csv header null ''"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/scripts/data-sync/upsert_ncaaf_injuries.sql"
fi

# 7) Quick checks
psql "$SUPABASE_DB_URL" -c "select season, count(*) as team_rows   from public.ncaaf_teams   group by season order by season;"
psql "$SUPABASE_DB_URL" -c "select season, count(*) as player_rows from public.ncaaf_players group by season order by season;"
psql "$SUPABASE_DB_URL" -c "select season, week, count(*) rows from public.ncaaf_injuries group by season, week order by season desc, week desc limit 10;" || true
