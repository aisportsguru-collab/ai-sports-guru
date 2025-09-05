#!/usr/bin/env python3
"""
NCAAB daily updater.
- Robust import path handling so it runs in GitHub Actions and locally.
- Offseason-friendly: exits 0 if no games (so workflows stay green).
- When the season starts, wire real daily game/team/player updates here.
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
    # Fallback if executed directly from scripts/ncaab
    sys.path.append(os.path.dirname(__file__))
    from supabase_client import get_client  # type: ignore

SPORT = "NCAAB"
sb = get_client()

def run_daily():
    today = datetime.now(timezone.utc).date().isoformat()
    # Offseason safe no-op (no CI failures). Replace this block with real daily pull once season starts.
    print(f"[ncaab-daily] {today}: offseason/no schedule; skipping (no-op).")
    # Example shape for future upserts:
    # sb.table("games").upsert({...}, on_conflict="provider_game_id").execute()
    # sb.table("team_game_stats").upsert({...}, on_conflict="sport,game_id,team_id").execute()
    # sb.table("player_game_stats").upsert({...}, on_conflict="sport,game_id,player_id").execute()
    return 0

if __name__ == "__main__":
    # Warm connection so auth issues show clearly
    sb.table("games").select("id", count="exact").eq("sport", SPORT).execute()
    code = run_daily()
    if code != 0:
        raise SystemExit(code)
    print("[ncaab-daily] complete.")
