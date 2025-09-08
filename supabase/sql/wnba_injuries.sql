create table if not exists public.wnba_injuries (
  id            uuid primary key default gen_random_uuid(),
  sport         text not null default 'WNBA',
  report_date   date not null,
  team_name     text not null,
  player_name   text not null,
  status        text,
  description   text,
  source        text,
  raw           jsonb,
  created_at    timestamptz default now()
);

create unique index if not exists wnba_injuries_uniq
  on public.wnba_injuries (sport, report_date, team_name, player_name);

-- Helpful indexes that are safe to re run
create index if not exists games_sport_date_idx on public.games(sport, game_date);
create unique index if not exists games_provider_unique on public.games(sport, provider_game_id);
create index if not exists team_stats_game_idx on public.team_game_stats(sport, game_id, team_id);
create index if not exists player_stats_game_idx on public.player_game_stats(sport, game_id, player_id);
