#!/usr/bin/env python3
"""
Daily team/player update (current season only) using your existing ncaaf_sync.sh.
Defaults to current year; can override with SEASONS.
"""
import os, subprocess, sys, datetime, shlex

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def run(cmd):
    print(">>", cmd)
    res = subprocess.run(cmd, shell=True, env=os.environ.copy())
    if res.returncode != 0:
        sys.exit(res.returncode)

def main():
    if not os.environ.get("SUPABASE_DB_URL"):
        print("ERROR: SUPABASE_DB_URL not set", file=sys.stderr)
        sys.exit(2)
    y = datetime.datetime.now().year
    seasons = os.environ.get("SEASONS", str(y))
    sync_sh = os.path.join(ROOT, "scripts", "data-sync", "ncaaf_sync.sh")
    if not os.path.exists(sync_sh):
        print(f"ERROR: {sync_sh} not found.", file=sys.stderr)
        sys.exit(3)
    run(f'SEASONS="{seasons}" bash {shlex.quote(sync_sh)}')

    # Optionally refresh materialized views
    run('psql "$SUPABASE_DB_URL" -c "refresh materialized view concurrently public.ncaaf_teams_last3;" || true')
    run('psql "$SUPABASE_DB_URL" -c "refresh materialized view concurrently public.ncaaf_players_last3;" || true')

if __name__ == "__main__":
    main()
