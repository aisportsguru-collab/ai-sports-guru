-- TEMP staging tables shaped like targets
drop table if exists _stg_players;
create temporary table _stg_players as select * from public.nfl_players limit 0;

drop table if exists _stg_teams;
create temporary table _stg_teams as select * from public.nfl_teams limit 0;

-- Load CSVs into staging
\copy _stg_players from 'nfl_players.csv' with (format csv, header true, encoding 'UTF8');
\copy _stg_teams   from 'nfl_teams.csv'   with (format csv, header true, encoding 'UTF8');

-- Upsert players (season, player_id, team_id)
insert into public.nfl_players
select * from _stg_players
on conflict (season, player_id, team_id) do update
set
  player_name = excluded.player_name,
  team_name = excluded.team_name,
  position = excluded.position,
  age = excluded.age,
  games_played = excluded.games_played,
  games_started = excluded.games_started,
  snap_pct_offense = excluded.snap_pct_offense,
  snap_pct_defense = excluded.snap_pct_defense,
  snap_pct_st = excluded.snap_pct_st,
  pass_attempts = excluded.pass_attempts,
  pass_completions = excluded.pass_completions,
  pass_yards = excluded.pass_yards,
  pass_tds = excluded.pass_tds,
  interceptions = excluded.interceptions,
  sacks_taken = excluded.sacks_taken,
  sack_yards_lost = excluded.sack_yards_lost,
  pass_first_downs = excluded.pass_first_downs,
  pass_air_yards = excluded.pass_air_yards,
  pass_yac = excluded.pass_yac,
  rush_attempts = excluded.rush_attempts,
  rush_yards = excluded.rush_yards,
  rush_tds = excluded.rush_tds,
  rush_first_downs = excluded.rush_first_downs,
  rush_yac = excluded.rush_yac,
  rush_yco = excluded.rush_yco,
  targets = excluded.targets,
  receptions = excluded.receptions,
  rec_yards = excluded.rec_yards,
  rec_tds = excluded.rec_tds,
  rec_first_downs = excluded.rec_first_downs,
  air_yards = excluded.air_yards,
  yac = excluded.yac,
  adot = excluded.adot,
  target_share = excluded.target_share,
  air_yards_share = excluded.air_yards_share,
  tackles_solo = excluded.tackles_solo,
  tackles_ast = excluded.tackles_ast,
  tackles_total = excluded.tackles_total,
  tfl = excluded.tfl,
  qb_hits = excluded.qb_hits,
  sacks = excluded.sacks,
  passes_defended = excluded.passes_defended,
  ints = excluded.ints,
  forced_fumbles = excluded.forced_fumbles,
  fumbles = excluded.fumbles,
  fumbles_lost = excluded.fumbles_lost,
  fgm = excluded.fgm,
  fga = excluded.fga,
  xpm = excluded.xpm,
  xpa = excluded.xpa,
  punt_yards = excluded.punt_yards,
  punt_avg = excluded.punt_avg,
  kick_ret_yards = excluded.kick_ret_yards,
  punt_ret_yards = excluded.punt_ret_yards,
  ngs_avg_separation = excluded.ngs_avg_separation,
  ngs_top_speed = excluded.ngs_top_speed,
  pff_offense_grade = excluded.pff_offense_grade,
  pff_pass_grade = excluded.pff_pass_grade,
  pff_run_grade = excluded.pff_run_grade,
  pff_coverage_grade = excluded.pff_coverage_grade;

-- Upsert teams (season, team_id)
insert into public.nfl_teams
select * from _stg_teams
on conflict (season, team_id) do update
set
  team_name = excluded.team_name,
  conference = excluded.conference,
  division = excluded.division,
  games_played = excluded.games_played,
  wins = excluded.wins,
  losses = excluded.losses,
  ties = excluded.ties,
  points_for = excluded.points_for,
  points_against = excluded.points_against,
  yards_for = excluded.yards_for,
  yards_against = excluded.yards_against,
  plays_for = excluded.plays_for,
  plays_against = excluded.plays_against,
  first_downs_for = excluded.first_downs_for,
  first_downs_against = excluded.first_downs_against,
  pass_yards_for = excluded.pass_yards_for,
  rush_yards_for = excluded.rush_yards_for,
  pass_yards_against = excluded.pass_yards_against,
  rush_yards_against = excluded.rush_yards_against,
  turnovers = excluded.turnovers,
  takeaways = excluded.takeaways,
  penalties = excluded.penalties,
  penalty_yards = excluded.penalty_yards,
  epa_per_play_offense = excluded.epa_per_play_offense,
  epa_per_play_defense = excluded.epa_per_play_defense,
  success_rate_offense = excluded.success_rate_offense,
  success_rate_defense = excluded.success_rate_defense,
  dvoa_total = excluded.dvoa_total,
  dvoa_offense = excluded.dvoa_offense,
  dvoa_defense = excluded.dvoa_defense,
  pff_team_grade_offense = excluded.pff_team_grade_offense,
  pff_team_grade_defense = excluded.pff_team_grade_defense;
