#!/usr/bin/env python3
"""
Daily injuries update. Prefers DeepSearch INJ_CSV if provided;
else runs your injuries_sync_ncaaf.sh for current and prior seasons.
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

    inj_csv = os.environ.get("INJ_CSV", "")
    if inj_csv:
        loader = os.path.join(ROOT, "scripts", "data-sync", "deepsearch_load_ncaaf.sh")
        if not os.path.exists(loader):
            print(f"ERROR: {loader} not found. Add DeepSearch loader or unset INJ_CSV.", file=sys.stderr)
            sys.exit(3)
        run(f'INJ_CSV="{inj_csv}" bash {shlex.quote(loader)}')
        sys.exit(0)

    y = datetime.datetime.now().year
    inj_sh = os.path.join(ROOT, "scripts", "data-sync", "injuries_sync_ncaaf.sh")
    if not os.path.exists(inj_sh):
        print(f"ERROR: {inj_sh} not found.", file=sys.stderr)
        sys.exit(4)
    seasons = os.environ.get("INJURY_SEASONS", f"{y},{y-1},{y-2}")
    run(f'INJURY_SEASONS="{seasons}" bash {shlex.quote(inj_sh)}')

if __name__ == "__main__":
    main()
