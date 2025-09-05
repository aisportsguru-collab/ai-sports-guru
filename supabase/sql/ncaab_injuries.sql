create table if not exists public.ncaab_injuries (
  id uuid primary key default gen_random_uuid(),
  sport text not null default 'NCAAB',
  team_name text,
  player_name text,
  status text,
  description text,
  report_date date,
  raw jsonb,
  created_at timestamptz default now()
);

create index if not exists ncaab_injuries_idx on public.ncaab_injuries (sport, team_name, report_date);

-- De-dup helper: not a hard unique, but we'll upsert by (sport, team_name, player_name, report_date)
