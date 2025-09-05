-- idempotent timestamp touch function
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'moddatetime' and n.nspname = 'public'
  ) then
    create or replace function public.moddatetime()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at = now();
      return new;
    end
    $fn$;
  end if;
end$$;

-- NCAAB team season stats
create table if not exists public.ncaab_team_season_stats (
  id                  uuid primary key default gen_random_uuid(),
  sport               text not null default 'NCAAB',
  season              integer not null,
  team_id             bigint not null,   -- explicit type; FK added later
  team_id_external    text,
  team_name           text not null,
  games               integer,
  wins                integer,
  losses              integer,
  ppg                 numeric,
  opp_ppg             numeric,
  pace                numeric,
  ortg                numeric,
  drtg                numeric,
  srs                 numeric,
  efg_pct             numeric,
  ts_pct              numeric,
  ftr                 numeric,
  threepa_rate        numeric,
  tov_pct             numeric,
  orb_pct             numeric,
  drb_pct             numeric,
  stl_pct             numeric,
  blk_pct             numeric,
  raw                 jsonb,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create unique index if not exists ncaab_team_season_unique
on public.ncaab_team_season_stats (sport, season, team_id);

drop trigger if exists ncaab_team_season_touch on public.ncaab_team_season_stats;
create trigger ncaab_team_season_touch
before update on public.ncaab_team_season_stats
for each row execute procedure public.moddatetime();

-- NCAAB player season stats
create table if not exists public.ncaab_player_season_stats (
  id                  uuid primary key default gen_random_uuid(),
  sport               text not null default 'NCAAB',
  season              integer not null,
  team_id             bigint,            -- explicit type; FK added later
  player_id           uuid not null,     -- explicit type; FK added later
  player_id_external  text,
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

drop trigger if exists ncaab_player_season_touch on public.ncaab_player_season_stats;
create trigger ncaab_player_season_touch
before update on public.ncaab_player_season_stats
for each row execute procedure public.moddatetime();
