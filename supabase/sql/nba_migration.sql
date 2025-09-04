-- Ensure tables exist with minimal shape, then add NBA specific columns only if missing

-- TEAMS
create table if not exists public.teams (
  id bigserial primary key
);
alter table public.teams add column if not exists sport text default 'NBA';
alter table public.teams add column if not exists team_id_external text;
alter table public.teams add column if not exists name text;
alter table public.teams add column if not exists abbr text;

create index if not exists teams_sport_idx on public.teams (sport);
create unique index if not exists teams_unique_sport_name_idx on public.teams (sport, name);

-- PLAYERS
create table if not exists public.players (
  id bigserial primary key
);
alter table public.players add column if not exists sport text default 'NBA';
alter table public.players add column if not exists player_id_external text;
alter table public.players add column if not exists full_name text;
alter table public.players add column if not exists first_name text;
alter table public.players add column if not exists last_name text;
alter table public.players add column if not exists primary_team_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'players_primary_team_id_fkey'
  ) then
    alter table public.players
      add constraint players_primary_team_id_fkey
      foreign key (primary_team_id) references public.teams(id) on delete set null;
  end if;
end $$;

create index if not exists players_sport_idx on public.players (sport);
create unique index if not exists players_unique_sport_playerext_idx on public.players (sport, player_id_external);

-- GAMES
create table if not exists public.games (
  id bigserial primary key
);
alter table public.games add column if not exists sport text default 'NBA';
alter table public.games add column if not exists game_id_external text;
alter table public.games add column if not exists season text;
alter table public.games add column if not exists season_type text;
alter table public.games add column if not exists game_date date;
alter table public.games add column if not exists home_team_id bigint;
alter table public.games add column if not exists away_team_id bigint;
alter table public.games add column if not exists home_score integer;
alter table public.games add column if not exists away_score integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'games_home_team_id_fkey'
  ) then
    alter table public.games
      add constraint games_home_team_id_fkey
      foreign key (home_team_id) references public.teams(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'games_away_team_id_fkey'
  ) then
    alter table public.games
      add constraint games_away_team_id_fkey
      foreign key (away_team_id) references public.teams(id) on delete set null;
  end if;
end $$;

create index if not exists games_sport_idx on public.games (sport);
create unique index if not exists games_unique_sport_gameext_idx on public.games (sport, game_id_external);

-- TEAM GAME STATS
create table if not exists public.team_game_stats (
  id bigserial primary key
);
alter table public.team_game_stats add column if not exists sport text default 'NBA';
alter table public.team_game_stats add column if not exists game_id bigint;
alter table public.team_game_stats add column if not exists team_id bigint;

-- basic
alter table public.team_game_stats add column if not exists pts integer;
alter table public.team_game_stats add column if not exists fgm integer;
alter table public.team_game_stats add column if not exists fga integer;
alter table public.team_game_stats add column if not exists fg3m integer;
alter table public.team_game_stats add column if not exists fg3a integer;
alter table public.team_game_stats add column if not exists ftm integer;
alter table public.team_game_stats add column if not exists fta integer;
alter table public.team_game_stats add column if not exists oreb integer;
alter table public.team_game_stats add column if not exists dreb integer;
alter table public.team_game_stats add column if not exists reb integer;
alter table public.team_game_stats add column if not exists ast integer;
alter table public.team_game_stats add column if not exists stl integer;
alter table public.team_game_stats add column if not exists blk integer;
alter table public.team_game_stats add column if not exists tov integer;
alter table public.team_game_stats add column if not exists pf integer;
alter table public.team_game_stats add column if not exists plus_minus integer;

-- advanced
alter table public.team_game_stats add column if not exists off_rating numeric;
alter table public.team_game_stats add column if not exists def_rating numeric;
alter table public.team_game_stats add column if not exists pace numeric;
alter table public.team_game_stats add column if not exists efg_pct numeric;
alter table public.team_game_stats add column if not exists oreb_pct numeric;
alter table public.team_game_stats add column if not exists dreb_pct numeric;
alter table public.team_game_stats add column if not exists reb_pct numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'team_game_stats_game_id_fkey'
  ) then
    alter table public.team_game_stats
      add constraint team_game_stats_game_id_fkey
      foreign key (game_id) references public.games(id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'team_game_stats_team_id_fkey'
  ) then
    alter table public.team_game_stats
      add constraint team_game_stats_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete cascade;
  end if;
end $$;

create unique index if not exists team_game_stats_unique_triplet_idx on public.team_game_stats (sport, game_id, team_id);

-- PLAYER GAME STATS
create table if not exists public.player_game_stats (
  id bigserial primary key
);
alter table public.player_game_stats add column if not exists sport text default 'NBA';
alter table public.player_game_stats add column if not exists game_id bigint;
alter table public.player_game_stats add column if not exists player_id bigint;
alter table public.player_game_stats add column if not exists team_id bigint;

alter table public.player_game_stats add column if not exists minutes text;
alter table public.player_game_stats add column if not exists pts integer;
alter table public.player_game_stats add column if not exists fgm integer;
alter table public.player_game_stats add column if not exists fga integer;
alter table public.player_game_stats add column if not exists fg3m integer;
alter table public.player_game_stats add column if not exists fg3a integer;
alter table public.player_game_stats add column if not exists ftm integer;
alter table public.player_game_stats add column if not exists fta integer;
alter table public.player_game_stats add column if not exists oreb integer;
alter table public.player_game_stats add column if not exists dreb integer;
alter table public.player_game_stats add column if not exists reb integer;
alter table public.player_game_stats add column if not exists ast integer;
alter table public.player_game_stats add column if not exists stl integer;
alter table public.player_game_stats add column if not exists blk integer;
alter table public.player_game_stats add column if not exists tov integer;
alter table public.player_game_stats add column if not exists pf integer;
alter table public.player_game_stats add column if not exists plus_minus integer;

alter table public.player_game_stats add column if not exists usg_pct numeric;
alter table public.player_game_stats add column if not exists ts_pct numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'player_game_stats_game_id_fkey'
  ) then
    alter table public.player_game_stats
      add constraint player_game_stats_game_id_fkey
      foreign key (game_id) references public.games(id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'player_game_stats_player_id_fkey'
  ) then
    alter table public.player_game_stats
      add constraint player_game_stats_player_id_fkey
      foreign key (player_id) references public.players(id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'player_game_stats_team_id_fkey'
  ) then
    alter table public.player_game_stats
      add constraint player_game_stats_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete set null;
  end if;
end $$;

create unique index if not exists player_game_stats_unique_triplet_idx on public.player_game_stats (sport, game_id, player_id);
