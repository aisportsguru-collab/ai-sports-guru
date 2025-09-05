#!/usr/bin/env python3
"""
NCAAB roster refresh (run occasionally/preseason).
- Robust import path handling for Actions/local.
- Offseason-friendly no-op; logs and exits 0.
- When sources are ready, populate/merge into teams & players.
"""

import os, sys
from datetime import datetime, timezone

# Ensure repo root on sys.path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

try:
    from scripts.ncaab.supabase_client import get_client
except ModuleNotFoundError:
    sys.path.append(os.path.dirname(__file__))
    from supabase_client import get_client  # type: ignore

SPORT = "NCAAB"
sb = get_client()

def run_refresh():
    today = datetime.now(timezone.utc).date().isoformat()
    print(f"[ncaab-roster] {today}: roster source not wired yet; skipping (no-op).")
    # Example future logic:
    # for each team: fetch roster → upsert into players (primary_team_id), link to teams
    # sb.table("players").upsert({...}, on_conflict="sport,player_id_external").execute()
    return 0

if __name__ == "__main__":
    sb.table("players").select("id", count="exact").eq("sport", SPORT).execute()
    code = run_refresh()
    if code != 0:
        raise SystemExit(code)
    print("[ncaab-roster] complete.")
