-- Make sure we can upsert into public.games using (sport, provider_game_id)
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'games_unique_sport_provider_idx'
  ) then
    create unique index games_unique_sport_provider_idx
      on public.games (sport, provider_game_id);
  end if;
end $$;
