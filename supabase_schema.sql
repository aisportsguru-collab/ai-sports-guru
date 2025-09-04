-- leagues are free-text but we’ll normalize as lowercase: nfl/nba/mlb/nhl/ncaaf/ncaab/wnba

create table if not exists games (
  id bigint generated always as identity primary key,
  league text not null,
  game_id text not null unique,          -- external id (OddsAPI or your join key)
  game_time timestamptz,
  away_team text not null,
  home_team text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists odds (
  id bigint generated always as identity primary key,
  game_id text not null references games(game_id) on delete cascade,
  sportsbook text not null,              -- e.g. betmgm/draftkings/fanduel
  moneyline_away int,
  moneyline_home int,
  spread_away numeric,
  spread_home numeric,
  total_points numeric,
  updated_at timestamptz default now(),
  unique (game_id, sportsbook)
);

create table if not exists predictions (
  id bigint generated always as identity primary key,
  game_id text not null references games(game_id) on delete cascade,
  model_version text not null default 'v1',
  pick_type text not null check (pick_type in ('moneyline','spread','total')),
  pick_side text,                        -- team for moneyline/spread, 'over'/'under' for total
  pick_value numeric,                    -- spread value or total number when applicable
  confidence numeric,                    -- 0..1
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (game_id, model_version, pick_type)
);

create table if not exists public_bets (
  id bigint generated always as identity primary key,
  game_id text not null references games(game_id) on delete cascade,
  side text not null,                    -- 'away','home','over','under','away_spread','home_spread'
  percent numeric not null,              -- 0..1
  source text,
  updated_at timestamptz default now(),
  unique (game_id, side)
);
