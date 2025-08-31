-- Tables
CREATE TABLE IF NOT EXISTS public.mlb_players (
  season int NOT NULL,
  player_id int NOT NULL,
  player_name text,
  last_known_team_id int,
  last_known_team_abbr text,
  primary_pos text,
  age int,
  bats text,
  throws text,

  pa int, ab int, r int, h int, "double" int, "triple" int, hr int, rbi int, bb int, ibb int, so int, hbp int, sb int, cs int,
  avg numeric, obp numeric, slg numeric, ops numeric, iso numeric, babip numeric, woba numeric, wrc_plus numeric,

  ip numeric, bf int, h_allowed int, er int, bb_allowed int, so_pitch int, hr_allowed int,
  era numeric, fip numeric, xfip numeric, whip numeric, k_pct numeric, bb_pct numeric, k_bb_pct numeric, gb_pct numeric, fb_pct numeric, hr_fb_pct numeric,

  innings_field numeric, chances int, putouts int, assists int, errors int, drs numeric, uzr numeric,
  source text,
  PRIMARY KEY (season, player_id)
);

CREATE TABLE IF NOT EXISTS public.mlb_teams (
  season int NOT NULL,
  team_id int NOT NULL,
  team_abbr text,
  team_name text,
  league text,
  division text,
  games int,
  wins int,
  losses int,
  runs_scored int,
  runs_allowed int,
  run_diff int,
  team_avg numeric,
  team_obp numeric,
  team_slg numeric,
  team_ops numeric,
  team_era numeric,
  team_fip numeric,
  team_whip numeric,
  team_woba numeric,
  team_wrc_plus numeric,
  source text,
  PRIMARY KEY (season, team_id)
);

CREATE TABLE IF NOT EXISTS public.mlb_injuries (
  season int NOT NULL,
  date_report date NOT NULL,
  team_id int NOT NULL,
  team_abbr text,
  player_id int,
  player_name text,
  pos text,
  status text,
  designation text,
  il_days int,
  retro_date date,
  expected_return text,
  description text,
  source text,
  PRIMARY KEY (season, date_report, team_id, player_id, player_name)
);

-- Staging
DROP TABLE IF EXISTS _stg_mlb_players;
CREATE TEMP TABLE _stg_mlb_players (LIKE public.mlb_players);

DROP TABLE IF EXISTS _stg_mlb_teams;
CREATE TEMP TABLE _stg_mlb_teams (LIKE public.mlb_teams);

DROP TABLE IF EXISTS _stg_mlb_injuries;
CREATE TEMP TABLE _stg_mlb_injuries (LIKE public.mlb_injuries);
