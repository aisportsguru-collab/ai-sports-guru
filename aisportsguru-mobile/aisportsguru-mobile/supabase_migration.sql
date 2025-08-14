begin;

-- games
create table if not exists public.games (
  id bigserial primary key,
  provider_game_id text unique,
  sport text not null,
  home_team text not null,
  away_team text not null,
  commence_time timestamptz,
  status text default 'scheduled',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.games add column if not exists provider_game_id text;
alter table public.games add column if not exists sport text;
alter table public.games alter column sport drop not null;
alter table public.games add column if not exists home_team text;
alter table public.games add column if not exists away_team text;
alter table public.games add column if not exists commence_time timestamptz;
alter table public.games add column if not exists status text;
alter table public.games add column if not exists created_at timestamptz default now();
alter table public.games add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='games' and column_name='game_time'
  ) then
    update public.games
      set commence_time = coalesce(commence_time, game_time)
    where commence_time is null;
  end if;
end $$;

create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_games_touch on public.games;
create trigger trg_games_touch before update on public.games
for each row execute function public.tg_touch_updated_at();

create index if not exists games_sport_commence_idx on public.games (sport, commence_time);

-- odds
create table if not exists public.odds (
  id bigserial primary key,
  game_id bigint not null references public.games(id) on delete cascade,
  source text not null default 'theoddsapi',
  moneyline_home numeric,
  moneyline_away numeric,
  spread_line numeric,
  spread_home numeric,
  spread_away numeric,
  total_points numeric,
  over_odds numeric,
  under_odds numeric,
  fetched_at timestamptz not null default now()
);
create index if not exists odds_game_time_idx on public.odds (game_id, fetched_at desc);

-- predictions
create table if not exists public.predictions (
  id bigserial primary key,
  game_id bigint not null references public.games(id) on delete cascade,
  model_version text not null default 'v1',
  pick_ml text,
  conf_ml numeric,
  pick_spread text,
  conf_spread numeric,
  pick_total text,
  conf_total numeric,
  features jsonb,
  created_at timestamptz default now(),
  unique (game_id, model_version)
);
create index if not exists predictions_game_idx on public.predictions (game_id);

-- results
create table if not exists public.results (
  id bigserial primary key,
  game_id bigint not null references public.games(id) on delete cascade,
  home_score int,
  away_score int,
  final_at timestamptz,
  created_at timestamptz default now(),
  unique (game_id)
);

-- grades
create table if not exists public.prediction_grades (
  id bigserial primary key,
  prediction_id bigint not null references public.predictions(id) on delete cascade,
  game_id bigint not null references public.games(id) on delete cascade,
  ml_correct bool,
  spread_correct bool,
  total_correct bool,
  graded_at timestamptz default now(),
  unique (prediction_id)
);

-- job runs
create table if not exists public.job_runs (
  id bigserial primary key,
  job_name text not null,
  started_at timestamptz default now(),
  finished_at timestamptz,
  success boolean default false,
  details jsonb
);

-- views
drop view if exists public.v_latest_odds cascade;
create or replace view public.v_latest_odds as
select distinct on (o.game_id)
  o.game_id, o.source, o.moneyline_home, o.moneyline_away,
  o.spread_line, o.spread_home, o.spread_away,
  o.total_points, o.over_odds, o.under_odds, o.fetched_at
from public.odds o
order by o.game_id, o.fetched_at desc;

drop view if exists public.v_predictions_api cascade;
create or replace view public.v_predictions_api as
select
  g.id as game_id,
  g.sport,
  g.home_team, g.away_team,
  g.commence_time,
  g.status,
  p.model_version,
  p.pick_ml, p.conf_ml,
  p.pick_spread, p.conf_spread,
  p.pick_total, p.conf_total,
  lo.moneyline_home, lo.moneyline_away,
  lo.spread_line, lo.spread_home, lo.spread_away,
  lo.total_points, lo.over_odds, lo.under_odds
from public.games g
left join public.v_latest_odds lo on lo.game_id = g.id
left join public.predictions p on p.game_id = g.id;

commit;
