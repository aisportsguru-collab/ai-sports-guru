# MLB data sync

## Local run

python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt

export SUPABASE_DB_URL='postgresql://postgres.ulhyywozxodeiwwqkrod:61y2DDMo3HsJbuIo@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require'
export SEASONS='2023,2024,2025'

psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/data-sync/mlb/create_mlb_tables.sql

python scripts/data-sync/mlb/fetch_mlb_stats_primary.py
python scripts/data-sync/mlb/fetch_mlb_injuries_primary.py
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/data-sync/mlb/upsert_mlb.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/data-sync/mlb/upsert_mlb_injuries.sql

## Verify

-- Teams per season
select season, count(*) teams_rows from public.mlb_teams group by season order by season;

-- Players per season
select season, count(*) players_rows from public.mlb_players group by season order by season;

-- Latest injuries by season
select season, max(date_report) latest_report, count(*) rows from public.mlb_injuries group by season order by season;

## Notes

Player ids come from team rosters in StatsAPI for each season. Stats come from pybaseball. Advanced metrics that require league constants are left null. ESPN injuries fallback is used if primary returns zero rows.
