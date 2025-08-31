create table if not exists public.ncaaf_injuries (
  season int not null,
  week int not null default 0,
  team text not null,
  player_id text,
  player_name text not null,
  position text,
  report_status text,        -- Questionable/Out/Doubtful/Probable/Active
  practice_status text,      -- DNP/Limited/Full
  designation text,          -- IR/PUP/Redshirt/Unavailable/etc
  body_part text,
  description text,
  source text default 'stub',
  date_updated timestamptz default now(),
  player_key text generated always as (coalesce(nullif(player_id,''), nullif(player_name,''))) stored,
  primary key (season, week, team, player_key)
);

-- Convenience current-season view
create or replace view public.ncaaf_injuries_current as
select *
from public.ncaaf_injuries
where season = extract(year from now())::int;
