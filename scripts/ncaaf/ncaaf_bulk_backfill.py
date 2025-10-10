#!/usr/bin/env python3
"""
Bulk backfill for NCAAF using your existing loaders.

Order of operations:
1) If DeepSearch CSVs provided (TEAMS_CSV / PLAYERS_CSV [/ INJ_CSV]), normalize and load.
2) Else run stats pipeline for explicit seasons (default: 2022-2025) via ncaaf_sync.sh.
3) Optionally run injuries backfill for same seasons.
4) Print verification row counts.

Env:
  SUPABASE_DB_URL   (required)
  SEASONS           default "2022,2023,2024,2025"
  TEAMS_CSV         optional path to DeepSearch teams CSV
  PLAYERS_CSV       optional path to DeepSearch players CSV
  INJ_CSV           optional path to DeepSearch injuries CSV
  INJURY_SEASONS    default mirrors SEASONS
"""
import os, subprocess, shlex, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def run(cmd, env=None):
    print(">>", cmd)
    res = subprocess.run(cmd, shell=True, env=env or os.environ.copy())
    if res.returncode != 0:
        sys.exit(res.returncode)

def main():
    sb = os.environ.get("SUPABASE_DB_URL")
    if not sb:
        print("ERROR: SUPABASE_DB_URL not set", file=sys.stderr)
        sys.exit(2)

    seasons = os.environ.get("SEASONS", "2022,2023,2024,2025")
    inj_seasons = os.environ.get("INJURY_SEASONS", seasons)

    teams_csv = os.environ.get("TEAMS_CSV", "")
    players_csv = os.environ.get("PLAYERS_CSV", "")
    inj_csv = os.environ.get("INJ_CSV", "")

    # Prefer DeepSearch CSV ingestion if provided
    if teams_csv or players_csv or inj_csv:
        script = os.path.join(ROOT, "scripts", "data-sync", "deepsearch_load_ncaaf.sh")
        if not os.path.exists(script):
            print(f"ERROR: {script} not found. Please add the DeepSearch loader first.", file=sys.stderr)
            sys.exit(3)
        run(f'TEAMS_CSV="{teams_csv}" PLAYERS_CSV="{players_csv}" INJ_CSV="{inj_csv}" bash {shlex.quote(script)}')
    else:
        # Fall back to your existing CFBD/ESPN pipeline for stats
        sync_sh = os.path.join(ROOT, "scripts", "data-sync", "ncaaf_sync.sh")
        if not os.path.exists(sync_sh):
            print(f"ERROR: {sync_sh} not found.", file=sys.stderr)
            sys.exit(4)
        run(f'SEASONS="{seasons}" bash {shlex.quote(sync_sh)}')

        # Injuries backfill
        inj_sh = os.path.join(ROOT, "scripts", "data-sync", "injuries_sync_ncaaf.sh")
        if os.path.exists(inj_sh):
            run(f'INJURY_SEASONS="{inj_seasons}" bash {shlex.quote(inj_sh)}')
        else:
            print("WARN: injuries_sync_ncaaf.sh not present; skipping injuries.", file=sys.stderr)

    # Verification (counts by season)
    run('psql "$SUPABASE_DB_URL" -c "select season, count(*) as team_rows from public.ncaaf_teams group by season order by season;"')
    run('psql "$SUPABASE_DB_URL" -c "select season, count(*) as player_rows from public.ncaaf_players group by season order by season;"')
    run('psql "$SUPABASE_DB_URL" -c "select season, week, count(*) rows from public.ncaaf_injuries group by season, week order by season desc, week desc limit 10;" || true')

if __name__ == "__main__":
    main()
