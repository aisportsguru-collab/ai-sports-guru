#!/usr/bin/env python3
"""
NCAAB injuries daily job.
- Robust import path handling so it runs from GitHub Actions or locally.
- Currently a safe no-op during offseason; when sources are enabled, insert rows into ncaab_injuries.
"""

import os, sys, time
from datetime import datetime, timezone

# Ensure repo root on sys.path (so "scripts.ncaab.supabase_client" works)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

try:
    from scripts.ncaab.supabase_client import get_client
except ModuleNotFoundError:
    # Fallback if executed directly from scripts/ncaab
    sys.path.append(os.path.dirname(__file__))
    from supabase_client import get_client  # type: ignore

sb = get_client()
SPORT = "NCAAB"

def upsert_injury(payload: dict):
    """
    Expected columns in public.ncaab_injuries (adjust if your SQL differs):
      sport text, report_date date, team_name text, player_name text,
      status text, description text, source text, raw jsonb
    """
    sb.table("ncaab_injuries").upsert(
        payload,
        on_conflict="sport,report_date,team_name,player_name"
    ).execute()

def run():
    # Offseason-friendly: don’t fail the job if there are no injuries available yet.
    # Wire real sources here (Rotowire/Covers/etc.) once the season starts.
    today = datetime.now(timezone.utc).date().isoformat()
    print(f"[ncaab-injuries] {today}: no official source enabled yet; skipping (no-op).")
    # Example shape for future insertion:
    # upsert_injury({
    #     "sport": SPORT,
    #     "report_date": today,
    #     "team_name": "Duke Blue Devils",
    #     "player_name": "John Smith",
    #     "status": "Out",
    #     "description": "Lower-body",
    #     "source": "rotowire",
    #     "raw": {"example": True}
    # })
    return 0

if __name__ == "__main__":
    # Quick connection warmup to surface auth errors clearly
    sb.table("ncaab_injuries").select("sport", count="exact").eq("sport", SPORT).execute()
    rc = run()
    if rc != 0:
        raise SystemExit(rc)
    print("[ncaab-injuries] complete.")
