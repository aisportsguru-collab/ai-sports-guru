create table if not exists public.ncaaf_teams (
  season int not null,
  team text not null,
  team_id text,
  conference text,
  division text,
  games int,
  points_for numeric,
  points_against numeric,
  yards_offense numeric,
  yards_passing_offense numeric,
  yards_rushing_offense numeric,
  first_downs_offense numeric,
  turnovers_lost numeric,
  yards_defense_allowed numeric,
  yards_passing_defense_allowed numeric,
  yards_rushing_defense_allowed numeric,
  sacks_defense numeric,
  interceptions_defense numeric,
  takeaways numeric,
  third_down_offense_pct numeric,
  third_down_defense_pct numeric,
  red_zone_offense_pct numeric,
  red_zone_defense_pct numeric,
  time_of_possession_sec numeric,
  updated_at timestamptz default now(),
  primary key (season, team)
);

create table if not exists public.ncaaf_players (
  season int not null,
  team text not null,
  player_id text,
  player_name text not null,
  position text,
  class text,
  games int,
  pass_att numeric, pass_cmp numeric, pass_yds numeric, pass_td numeric, pass_int numeric, pass_sacks numeric, pass_ypa numeric, pass_rating numeric,
  rush_att numeric, rush_yds numeric, rush_td numeric, rush_ypa numeric,
  rec_rec numeric, rec_tgt numeric, rec_yds numeric, rec_td numeric, rec_ypr numeric,
  def_tackles_total numeric, def_tackles_solo numeric, def_tfl numeric, def_sacks numeric, def_pd numeric, def_int numeric, def_ff numeric, def_fr numeric,
  kick_fgm numeric, kick_fga numeric, kick_xpm numeric, kick_xpa numeric, punt_avg numeric, punt_ct numeric,
  team_id text,
  updated_at timestamptz default now(),
  primary key (season, team, player_name)
);

create or replace view public.ncaaf_teams_current as
select * from public.ncaaf_teams where season = extract(year from now())::int;

create or replace view public.ncaaf_players_current as
select * from public.ncaaf_players where season = extract(year from now())::int;
