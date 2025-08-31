\set ON_ERROR_STOP on

\i scripts/data-sync/mlb/create_mlb_tables.sql

TRUNCATE _stg_mlb_injuries;

\copy _stg_mlb_injuries FROM 'mlb_injuries.csv' WITH (FORMAT csv, HEADER true)

UPDATE _stg_mlb_injuries SET
  team_abbr = NULLIF(trim(team_abbr),''),
  player_name = NULLIF(trim(player_name),''),
  pos = NULLIF(trim(pos),''),
  status = NULLIF(trim(status),''),
  designation = NULLIF(trim(designation),''),
  expected_return = NULLIF(trim(expected_return),''),
  description = NULLIF(trim(description),''),
  source = NULLIF(trim(source),'')
;

INSERT INTO public.mlb_injuries AS t(
  season, date_report, team_id, team_abbr,
  player_id, player_name, pos,
  status, designation, il_days, retro_date, expected_return, description, source
)
SELECT
  season, date_report, team_id, team_abbr,
  player_id, player_name, pos,
  status, designation, il_days, retro_date, expected_return, description, source
FROM _stg_mlb_injuries
ON CONFLICT (season, date_report, team_id, player_id, player_name) DO UPDATE SET
  team_abbr = EXCLUDED.team_abbr,
  pos = EXCLUDED.pos,
  status = EXCLUDED.status,
  designation = EXCLUDED.designation,
  il_days = EXCLUDED.il_days,
  retro_date = EXCLUDED.retro_date,
  expected_return = EXCLUDED.expected_return,
  description = EXCLUDED.description,
  source = EXCLUDED.source
;
