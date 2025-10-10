-- Creates injuries table if missing (aligns with your data-sync schema)
create table if not exists public.ncaaf_injuries (
  season int,
  week int,
  team text,
  player_id text,
  player_name text,
  position text,
  report_status text,
  practice_status text,
  designation text,
  body_part text,
  description text,
  source text default 'deepsearch',
  date_updated timestamptz default now(),
  player_key text generated always as (coalesce(nullif(player_id,''), nullif(player_name,''))) stored
);

create unique index if not exists ux_ncaaf_injuries_pk
  on public.ncaaf_injuries(season, week, team, player_key);
