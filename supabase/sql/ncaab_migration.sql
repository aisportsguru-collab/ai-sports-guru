-- NCAAB season aggregates (team + player), mirroring your shared teams/players tables.

-- Teams & players tables assumed to exist already:
-- public.teams(id uuid pk, sport text, name text, abbr text, team_id_external text, ...)
-- public.players(id uuid pk, sport text, player_id_external text, full_name text, first_name text, last_name text, primary_team_id uuid, ...)

create table if not exists public.ncaab_team_season_stats (
  id                  uuid primary key default gen_random_uuid(),
  sport               text not null default 'NCAAB',
  season              integer not null,
  team_id             uuid not null references public.teams(id) on delete cascade,
  team_id_external    text,         -- e.g. sportsref team id/slug
  team_name           text not null,

  -- common advanced + rate stats (nullable; depends on source availability)
  games               integer,
  wins                integer,
  losses              integer,
  ppg                 numeric,      -- points per game
  opp_ppg             numeric,      -- points allowed per game
  pace                numeric,
  ortg                numeric,      -- offensive rating
  drtg                numeric,      -- defensive rating
  srs                 numeric,      -- Simple Rating System
  efg_pct             numeric,
  ts_pct              numeric,
  ftr                 numeric,      -- FT rate
  threepa_rate        numeric,      -- 3PA rate
  tov_pct             numeric,
  orb_pct             numeric,
  drb_pct             numeric,
  stl_pct             numeric,
  blk_pct             numeric,

  raw                 jsonb,        -- raw dump for durability
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create unique index if not exists ncaab_team_season_unique
on public.ncaab_team_season_stats (sport, season, team_id);

create trigger ncaab_team_season_touch
before update on public.ncaab_team_season_stats
for each row execute procedure moddatetime (updated_at);


create table if not exists public.ncaab_player_season_stats (
  id                  uuid primary key default gen_random_uuid(),
  sport               text not null default 'NCAAB',
  season              integer not null,
  team_id             uuid references public.teams(id) on delete set null,
  player_id           uuid not null references public.players(id) on delete cascade,
  player_id_external  text,         -- e.g. sportsref player id
  player_name         text,

  games               integer,
  mpg                 numeric,
  ppg                 numeric,
  rpg                 numeric,
  apg                 numeric,
  spg                 numeric,
  bpg                 numeric,
  efg_pct             numeric,
  ts_pct              numeric,
  usg_pct             numeric,
  ortg                numeric,
  drtg                numeric,

  raw                 jsonb,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create unique index if not exists ncaab_player_season_unique
on public.ncaab_player_season_stats (sport, season, player_id);

create trigger ncaab_player_season_touch
before update on public.ncaab_player_season_stats
for each row execute procedure moddatetime (updated_at);
