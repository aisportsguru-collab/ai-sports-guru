#!/usr/bin/env python3
import os, time
from scripts.ncaab.supabase_client import get_client

try:
    from sportsipy.ncaab.teams import Teams
except Exception:
    from sportsreference.ncaab.teams import Teams

sb = get_client()
SPORT="NCAAB"
CURRENT = int(os.getenv("NCAAB_CURRENT_SEASON", "2025"))  # season ending year (e.g., 2025)

from scripts.ncaab.ncaab_bulk_backfill import team_payload, player_payload, upsert_team, upsert_player

def run_daily():
    print(f"[ncaab] daily refresh for season {CURRENT}")
    teams = Teams(CURRENT)
    # update team + players (upserts)
    for t in teams:
        tpay = team_payload(CURRENT, t)
        team_id = upsert_team(tpay["team_name"], None, tpay["team_id_external"])
        tpay["team_id"] = team_id
        sb.table("ncaab_team_season_stats").upsert(tpay, on_conflict="sport,season,team_id").execute()

        try:
            roster = t.roster
        except Exception as e:
            print(f"[ncaab] warn roster {tpay['team_name']}: {e}")
            continue

        for p in roster:
            ppay = player_payload(CURRENT, tpay["team_name"], team_id, p)
            pid = upsert_player(ppay["player_id_external"], ppay["player_name"], ppay.get("player_name","").split(" ")[0], " ".join((ppay.get("player_name","")+" ").split(" ")[1:]).strip(), team_id)
            ppay["player_id"] = pid
            sb.table("ncaab_player_season_stats").upsert(ppay, on_conflict="sport,season,player_id").execute()
        time.sleep(0.05)
    print("[ncaab] daily refresh complete.")
    
if __name__ == "__main__":
    try:
        run_daily()
    except Exception as e:
        print(f"[ncaab] warning: daily aborted: {e}")
    print("NCAAB daily update complete.")
