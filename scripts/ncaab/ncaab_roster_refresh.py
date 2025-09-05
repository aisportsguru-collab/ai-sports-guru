#!/usr/bin/env python3
import os, time
from scripts.ncaab.supabase_client import get_client
try:
    from sportsipy.ncaab.teams import Teams
except Exception:
    from sportsreference.ncaab.teams import Teams

from scripts.ncaab.ncaab_bulk_backfill import upsert_team, upsert_player

sb = get_client()
SPORT="NCAAB"
SEASON = int(os.getenv("NCAAB_REFRESH_SEASON","2026"))

def run():
    teams = Teams(SEASON)
    for t in teams:
        name = getattr(t,"name",None) or getattr(t,"school_name",None)
        ext  = getattr(t,"team_id",None) or name
        team_id = upsert_team(name, None, ext)
        try:
            roster = t.roster
        except Exception as e:
            print(f"[ncaab] roster refresh warn {name}: {e}")
            continue
        for p in roster:
            full = getattr(p,"name",None) or (getattr(p,"first_name","")+" "+getattr(p,"last_name","")).strip()
            first = getattr(p,"first_name",None) or (full.split(" ")[0] if full else None)
            last  = getattr(p,"last_name",None) or (" ".join(full.split(" ")[1:]) if full else None)
            extp  = getattr(p,"player_id",None) or full
            upsert_player(extp, full, first, last, team_id)
        time.sleep(0.05)
    print("[ncaab] roster refresh complete.")

if __name__=="__main__":
    run()
