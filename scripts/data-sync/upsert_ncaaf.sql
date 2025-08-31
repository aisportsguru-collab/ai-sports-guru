begin;

-- 1) Clean up staging strings
update public._stg_ncaaf_teams
   set team = trim(team);

update public._stg_ncaaf_players
   set team = trim(team),
       player_name = trim(player_name);

-- 2) Keep only players on FBS teams loaded this run
delete from public._stg_ncaaf_players sp
 where not exists (
   select 1
     from public._stg_ncaaf_teams st
    where st.season = sp.season
      and st.team   = sp.team
 );

-- 3) Upsert TEAMS
insert into public.ncaaf_teams as t (
  season,team,team_id,conference,division,games,
  points_for,points_against,
  yards_offense,yards_passing_offense,yards_rushing_offense,first_downs_offense,turnovers_lost,
  yards_defense_allowed,yards_passing_defense_allowed,yards_rushing_defense_allowed,
  sacks_defense,interceptions_defense,takeaways,
  third_down_offense_pct,third_down_defense_pct,
  red_zone_offense_pct,red_zone_defense_pct,
  time_of_possession_sec,updated_at
)
select
  season,team,team_id,conference,division,games,
  points_for,points_against,
  yards_offense,yards_passing_offense,yards_rushing_offense,first_downs_offense,turnovers_lost,
  yards_defense_allowed,yards_passing_defense_allowed,yards_rushing_defense_allowed,
  sacks_defense,interceptions_defense,takeaways,
  third_down_offense_pct,third_down_defense_pct,
  red_zone_offense_pct,red_zone_defense_pct,
  time_of_possession_sec, now()
from public._stg_ncaaf_teams
on conflict (season, team) do update set
  team_id = excluded.team_id,
  conference = excluded.conference,
  division = excluded.division,
  games = excluded.games,
  points_for = excluded.points_for,
  points_against = excluded.points_against,
  yards_offense = excluded.yards_offense,
  yards_passing_offense = excluded.yards_passing_offense,
  yards_rushing_offense = excluded.yards_rushing_offense,
  first_downs_offense = excluded.first_downs_offense,
  turnovers_lost = excluded.turnovers_lost,
  yards_defense_allowed = excluded.yards_defense_allowed,
  yards_passing_defense_allowed = excluded.yards_passing_defense_allowed,
  yards_rushing_defense_allowed = excluded.yards_rushing_defense_allowed,
  sacks_defense = excluded.sacks_defense,
  interceptions_defense = excluded.interceptions_defense,
  takeaways = excluded.takeaways,
  third_down_offense_pct = excluded.third_down_offense_pct,
  third_down_defense_pct = excluded.third_down_defense_pct,
  red_zone_offense_pct = excluded.red_zone_offense_pct,
  red_zone_defense_pct = excluded.red_zone_defense_pct,
  time_of_possession_sec = excluded.time_of_possession_sec,
  updated_at = now();

-- 4) Upsert PLAYERS
insert into public.ncaaf_players as p (
  season,team,player_id,player_name,position,class,games,
  pass_att,pass_cmp,pass_yds,pass_td,pass_int,pass_sacks,pass_ypa,pass_rating,
  rush_att,rush_yds,rush_td,rush_ypa,
  rec_rec,rec_tgt,rec_yds,rec_td,rec_ypr,
  def_tackles_total,def_tackles_solo,def_tfl,def_sacks,def_pd,def_int,def_ff,def_fr,
  kick_fgm,kick_fga,kick_xpm,kick_xpa,punt_avg,punt_ct,
  team_id,updated_at
)
select
  season,team,player_id,player_name,position,class,games,
  pass_att,pass_cmp,pass_yds,pass_td,pass_int,pass_sacks,pass_ypa,pass_rating,
  rush_att,rush_yds,rush_td,rush_ypa,
  rec_rec,rec_tgt,rec_yds,rec_td,rec_ypr,
  def_tackles_total,def_tackles_solo,def_tfl,def_sacks,def_pd,def_int,def_ff,def_fr,
  kick_fgm,kick_fga,kick_xpm,kick_xpa,punt_avg,punt_ct,
  team_id, now()
from public._stg_ncaaf_players
on conflict (season, team, player_name) do update set
  player_id = excluded.player_id,
  position = excluded.position,
  class = excluded.class,
  games = excluded.games,
  pass_att = excluded.pass_att, pass_cmp = excluded.pass_cmp, pass_yds = excluded.pass_yds,
  pass_td = excluded.pass_td, pass_int = excluded.pass_int, pass_sacks = excluded.pass_sacks,
  pass_ypa = excluded.pass_ypa, pass_rating = excluded.pass_rating,
  rush_att = excluded.rush_att, rush_yds = excluded.rush_yds, rush_td = excluded.rush_td, rush_ypa = excluded.rush_ypa,
  rec_rec = excluded.rec_rec, rec_tgt = excluded.rec_tgt, rec_yds = excluded.rec_yds, rec_td = excluded.rec_td, rec_ypr = excluded.rec_ypr,
  def_tackles_total = excluded.def_tackles_total, def_tackles_solo = excluded.def_tackles_solo, def_tfl = excluded.def_tfl,
  def_sacks = excluded.def_sacks, def_pd = excluded.def_pd, def_int = excluded.def_int, def_ff = excluded.def_ff, def_fr = excluded.def_fr,
  kick_fgm = excluded.kick_fgm, kick_fga = excluded.kick_fga, kick_xpm = excluded.kick_xpm, kick_xpa = excluded.kick_xpa,
  punt_avg = excluded.punt_avg, punt_ct = excluded.punt_ct,
  team_id = excluded.team_id,
  updated_at = now();

commit;

-- 5) Verification (handy in logs)
select season, count(*) as team_rows   from public.ncaaf_teams   group by season order by season;
select season, count(*) as player_rows from public.ncaaf_players group by season order by season;
