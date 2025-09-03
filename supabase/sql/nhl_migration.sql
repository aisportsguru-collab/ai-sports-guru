-- TEAM + PLAYER tables already exist; we only add if missing.

-- TEAMS (reuse)
create table if not exists public.teams (id bigserial primary key);
alter table public.teams add column if not exists sport text;
alter table public.teams add column if not exists team_id_external text;
alter table public.teams add column if not exists name text;
alter table public.teams add column if not exists abbr text;
create index if not exists teams_sport_idx on public.teams (sport);
create unique index if not exists teams_unique_sport_name_idx on public.teams (sport, name);

-- PLAYERS (reuse)
create table if not exists public.players (id bigserial primary key);
alter table public.players add column if not exists sport text;
alter table public.players add column if not exists player_id_external text;
alter table public.players add column if not exists full_name text;
alter table public.players add column if not exists first_name text;
alter table public.players add column if not exists last_name text;
alter table public.players add column if not exists primary_team_id bigint;

-- GAMES (reuse your existing structure; just ensure an upsert key)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='games_unique_sport_provider_idx'
  ) then
    create unique index games_unique_sport_provider_idx
      on public.games (sport, provider_game_id);
  end if;
end $$;

-- TEAM GAME STATS: add NHL-friendly columns (nullable; won’t affect NBA/others)
create table if not exists public.team_game_stats (id bigserial primary key);
alter table public.team_game_stats add column if not exists sport text;
alter table public.team_game_stats add column if not exists game_id uuid;  -- matches your games.id (uuid)
alter table public.team_game_stats add column if not exists team_id bigint;

-- Hockey basics
alter table public.team_game_stats add column if not exists goals_for int;
alter table public.team_game_stats add column if not exists goals_against int;
alter table public.team_game_stats add column if not exists shots_for int;
alter table public.team_game_stats add column if not exists shots_against int;
alter table public.team_game_stats add column if not exists pim int; -- penalty minutes
alter table public.team_game_stats add column if not exists hits_for int;
alter table public.team_game_stats add column if not exists blocks int;
alter table public.team_game_stats add column if not exists giveaways int;
alter table public.team_game_stats add column if not exists takeaways int;
alter table public.team_game_stats add column if not exists faceoff_win_pct numeric;
alter table public.team_game_stats add column if not exists pp_goals int;
alter table public.team_game_stats add column if not exists pp_opportunities int;
alter table public.team_game_stats add column if not exists sh_goals int; -- short-handed goals

-- Hockey advanced (nullable; we’ll fill if available)
alter table public.team_game_stats add column if not exists corsi_for int;
alter table public.team_game_stats add column if not exists corsi_against int;
alter table public.team_game_stats add column if not exists fenwick_for int;
alter table public.team_game_stats add column if not exists fenwick_against int;
alter table public.team_game_stats add column if not exists xg_for numeric;
alter table public.team_game_stats add column if not exists xg_against numeric;

-- FKs (safe recreate if missing)
do $$
begin
  if exists (select 1 from pg_constraint where conname='team_game_stats_game_id_fkey') then
    -- already present, keep
    null;
  else
    alter table public.team_game_stats
      add constraint team_game_stats_game_id_fkey
      foreign key (game_id) references public.games(id) on delete cascade;
  end if;

  if exists (select 1 from pg_constraint where conname='team_game_stats_team_id_fkey') then
    null;
  else
    alter table public.team_game_stats
      add constraint team_game_stats_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete cascade;
  end if;
end $$;

create unique index if not exists team_game_stats_unique_triplet_idx
  on public.team_game_stats (sport, game_id, team_id);

-- PLAYER GAME STATS: add NHL-friendly columns (nullable)
create table if not exists public.player_game_stats (id bigserial primary key);
alter table public.player_game_stats add column if not exists sport text;
alter table public.player_game_stats add column if not exists game_id uuid;
alter table public.player_game_stats add column if not exists player_id bigint;
alter table public.player_game_stats add column if not exists team_id bigint;

-- Skater basics
alter table public.player_game_stats add column if not exists goals int;
alter table public.player_game_stats add column if not exists assists int;
alter table public.player_game_stats add column if not exists points int;
alter table public.player_game_stats add column if not exists shots int;
alter table public.player_game_stats add column if not exists hits int;
alter table public.player_game_stats add column if not exists blocks int;
alter table public.player_game_stats add column if not exists pim int;
alter table public.player_game_stats add column if not exists plus_minus int;
alter table public.player_game_stats add column if not exists toi text;  -- time on ice "xx:yy"

-- Goalie fields
alter table public.player_game_stats add column if not exists goalie_sa int;  -- shots against
alter table public.player_game_stats add column if not exists goalie_sv int;  -- saves
alter table public.player_game_stats add column if not exists goalie_ga int;  -- goals against
alter table public.player_game_stats add column if not exists goalie_decision text; -- W/L/OT

-- Advanced (nullable)
alter table public.player_game_stats add column if not exists xg numeric;  -- individual expected goals (if available)

-- FKs
do $$
begin
  if not exists (select 1 from pg_constraint where conname='player_game_stats_game_id_fkey') then
    alter table public.player_game_stats
      add constraint player_game_stats_game_id_fkey
      foreign key (game_id) references public.games(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='player_game_stats_player_id_fkey') then
    alter table public.player_game_stats
      add constraint player_game_stats_player_id_fkey
      foreign key (player_id) references public.players(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='player_game_stats_team_id_fkey') then
    alter table public.player_game_stats
      add constraint player_game_stats_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete set null;
  end if;
end $$;

create unique index if not exists player_game_stats_unique_triplet_idx
  on public.player_game_stats (sport, game_id, player_id);
