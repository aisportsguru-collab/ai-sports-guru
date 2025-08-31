\set ON_ERROR_STOP on

-- Ensure tables and staging exist for this session
\i scripts/data-sync/mlb/create_mlb_tables.sql

TRUNCATE _stg_mlb_players;
TRUNCATE _stg_mlb_teams;

\copy _stg_mlb_players FROM 'mlb_players.csv' WITH (FORMAT csv, HEADER true)
\copy _stg_mlb_teams FROM 'mlb_teams.csv' WITH (FORMAT csv, HEADER true)

-- Normalize blanks to NULL
UPDATE _stg_mlb_players SET
  player_name = NULLIF(trim(player_name),''),
  last_known_team_abbr = NULLIF(trim(last_known_team_abbr),''),
  primary_pos = NULLIF(trim(primary_pos),''),
  bats = NULLIF(trim(bats),''),
  throws = NULLIF(trim(throws),''),
  source = NULLIF(trim(source),'')
;

UPDATE _stg_mlb_teams SET
  team_abbr = NULLIF(trim(team_abbr),''),
  team_name = NULLIF(trim(team_name),''),
  league = NULLIF(trim(league),''),
  division = NULLIF(trim(division),''),
  source = NULLIF(trim(source),'')
;

INSERT INTO public.mlb_players AS t (
  season, player_id, player_name, last_known_team_id, last_known_team_abbr, primary_pos,
  age, bats, throws,
  pa, ab, r, h, "double", "triple", hr, rbi, bb, ibb, so, hbp, sb, cs,
  avg, obp, slg, ops, iso, babip, woba, wrc_plus,
  ip, bf, h_allowed, er, bb_allowed, so_pitch, hr_allowed,
  era, fip, xfip, whip, k_pct, bb_pct, k_bb_pct, gb_pct, fb_pct, hr_fb_pct,
  innings_field, chances, putouts, assists, errors, drs, uzr,
  source
)
SELECT
  season, player_id, player_name, last_known_team_id, last_known_team_abbr, primary_pos,
  age, bats, throws,
  pa, ab, r, h, "double", "triple", hr, rbi, bb, ibb, so, hbp, sb, cs,
  avg, obp, slg, ops, iso, babip, woba, wrc_plus,
  ip, bf, h_allowed, er, bb_allowed, so_pitch, hr_allowed,
  era, fip, xfip, whip, k_pct, bb_pct, k_bb_pct, gb_pct, fb_pct, hr_fb_pct,
  innings_field, chances, putouts, assists, errors, drs, uzr,
  source
FROM _stg_mlb_players
WHERE player_id IS NOT NULL
ON CONFLICT (season, player_id) DO UPDATE SET
  player_name = EXCLUDED.player_name,
  last_known_team_id = EXCLUDED.last_known_team_id,
  last_known_team_abbr = EXCLUDED.last_known_team_abbr,
  primary_pos = EXCLUDED.primary_pos,
  age = EXCLUDED.age,
  bats = EXCLUDED.bats,
  throws = EXCLUDED.throws,
  pa = EXCLUDED.pa,
  ab = EXCLUDED.ab,
  r = EXCLUDED.r,
  h = EXCLUDED.h,
  "double" = EXCLUDED."double",
  "triple" = EXCLUDED."triple",
  hr = EXCLUDED.hr,
  rbi = EXCLUDED.rbi,
  bb = EXCLUDED.bb,
  ibb = EXCLUDED.ibb,
  so = EXCLUDED.so,
  hbp = EXCLUDED.hbp,
  sb = EXCLUDED.sb,
  cs = EXCLUDED.cs,
  avg = EXCLUDED.avg,
  obp = EXCLUDED.obp,
  slg = EXCLUDED.slg,
  ops = EXCLUDED.ops,
  iso = EXCLUDED.iso,
  babip = EXCLUDED.babip,
  woba = EXCLUDED.woba,
  wrc_plus = EXCLUDED.wrc_plus,
  ip = EXCLUDED.ip,
  bf = EXCLUDED.bf,
  h_allowed = EXCLUDED.h_allowed,
  er = EXCLUDED.er,
  bb_allowed = EXCLUDED.bb_allowed,
  so_pitch = EXCLUDED.so_pitch,
  hr_allowed = EXCLUDED.hr_allowed,
  era = EXCLUDED.era,
  fip = EXCLUDED.fip,
  xfip = EXCLUDED.xfip,
  whip = EXCLUDED.whip,
  k_pct = EXCLUDED.k_pct,
  bb_pct = EXCLUDED.bb_pct,
  k_bb_pct = EXCLUDED.k_bb_pct,
  gb_pct = EXCLUDED.gb_pct,
  fb_pct = EXCLUDED.fb_pct,
  hr_fb_pct = EXCLUDED.hr_fb_pct,
  innings_field = EXCLUDED.innings_field,
  chances = EXCLUDED.chances,
  putouts = EXCLUDED.putouts,
  assists = EXCLUDED.assists,
  errors = EXCLUDED.errors,
  drs = EXCLUDED.drs,
  uzr = EXCLUDED.uzr,
  source = EXCLUDED.source
;

INSERT INTO public.mlb_teams AS t (
  season, team_id, team_abbr, team_name, league, division,
  games, wins, losses, runs_scored, runs_allowed, run_diff,
  team_avg, team_obp, team_slg, team_ops,
  team_era, team_fip, team_whip,
  team_woba, team_wrc_plus,
  source
)
SELECT
  season, team_id, team_abbr, team_name, league, division,
  games, wins, losses, runs_scored, runs_allowed, run_diff,
  team_avg, team_obp, team_slg, team_ops,
  team_era, team_fip, team_whip,
  team_woba, team_wrc_plus,
  source
FROM _stg_mlb_teams
ON CONFLICT (season, team_id) DO UPDATE SET
  team_abbr = EXCLUDED.team_abbr,
  team_name = EXCLUDED.team_name,
  league = EXCLUDED.league,
  division = EXCLUDED.division,
  games = EXCLUDED.games,
  wins = EXCLUDED.wins,
  losses = EXCLUDED.losses,
  runs_scored = EXCLUDED.runs_scored,
  runs_allowed = EXCLUDED.runs_allowed,
  run_diff = EXCLUDED.run_diff,
  team_avg = EXCLUDED.team_avg,
  team_obp = EXCLUDED.team_obp,
  team_slg = EXCLUDED.team_slg,
  team_ops = EXCLUDED.team_ops,
  team_era = EXCLUDED.team_era,
  team_fip = EXCLUDED.team_fip,
  team_whip = EXCLUDED.team_whip,
  team_woba = EXCLUDED.team_woba,
  team_wrc_plus = EXCLUDED.team_wrc_plus,
  source = EXCLUDED.source
;
