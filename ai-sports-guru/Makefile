run-one:
	SEASONS=2024 bash scripts/data-sync/mlb/sync_mlb.sh
inj-one:
	bash scripts/data-sync/mlb/injuries_sync_mlb.sh
run-all:
	SEASONS=2023,2024,2025 bash scripts/data-sync/mlb/sync_mlb.sh
verify:
	psql "$$SUPABASE_DB_URL" -c "select season,count(*) from public.mlb_teams group by season order by season;"
	psql "$$SUPABASE_DB_URL" -c "select season,count(*) from public.mlb_players group by season order by season;"
	psql "$$SUPABASE_DB_URL" -c "select season,max(date_report),count(*) from public.mlb_injuries group by season order by season;"
