-- Inspect: games.id is uuid. Make child refs uuid too.

-- team_game_stats.game_id -> uuid + FK to games(id)
alter table public.team_game_stats
  alter column game_id type uuid using (nullif(game_id::text, '')::uuid);

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'team_game_stats_game_id_fkey') then
    alter table public.team_game_stats drop constraint team_game_stats_game_id_fkey;
  end if;
  alter table public.team_game_stats
    add constraint team_game_stats_game_id_fkey
    foreign key (game_id) references public.games(id) on delete cascade;
end $$;

-- player_game_stats.game_id -> uuid + FK to games(id)
alter table public.player_game_stats
  alter column game_id type uuid using (nullif(game_id::text, '')::uuid);

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'player_game_stats_game_id_fkey') then
    alter table public.player_game_stats drop constraint player_game_stats_game_id_fkey;
  end if;
  alter table public.player_game_stats
    add constraint player_game_stats_game_id_fkey
    foreign key (game_id) references public.games(id) on delete cascade;
end $$;

-- Keep unique indexes intact
