#!/usr/bin/env python3
import os, time, sys, requests, pandas as pd
from datetime import datetime, timezone

S = requests.Session()
S.headers.update({"User-Agent": "Mozilla/5.0 AiSportsGuru/1.0"})

def season_from_env():
    env = os.getenv("INJURY_SEASONS")
    if env:
        # use the max season in list
        try:
            seasons = sorted(set(int(s.strip()) for s in env.split(",") if s.strip()))
            return max(seasons)
        except Exception:
            pass
    # fallback: infer
    now = datetime.now(timezone.utc)
    return now.year if now.month >= 9 else now.year - 1

def j(url, params=None, tries=3, backoff=0.6):
    for i in range(tries):
        r = S.get(url, params=params, timeout=20)
        if r.status_code == 200:
            return r.json()
        time.sleep(backoff * (i+1))
    r.raise_for_status()

def main():
    season = season_from_env()

    # ESPN site injuries feed (not week-tagged; we’ll store week=0)
    url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries"
    try:
        data = j(url)
    except Exception as e:
        print(f"[espn_fallback] fetch failed: {e}", file=sys.stderr)
        sys.exit(2)

    rows = []
    now_iso = datetime.now(timezone.utc).isoformat()
    for grp in data.get("injuries", []):
        team = grp.get("team", {}).get("abbreviation")
        for item in grp.get("injuries", []):
            name = item.get("athlete", {}).get("displayName")
            pos  = item.get("athlete", {}).get("position", {}).get("abbreviation")
            status = item.get("status")  # e.g., Out, Questionable, IR
            details = item.get("details")
            body_part = item.get("type", {}).get("text") or None  # sometimes holds area
            designation = None
            # heuristic: IR or PUP sometimes inside status/details
            if status and "IR" in status.upper(): designation = "IR"
            elif details and "PUP" in details.upper(): designation = "PUP"

            rows.append({
                "season": season,
                "week": 0,                 # ESPN feed not by week; we use 0
                "team": team,
                "player_id": None,
                "player_name": name,
                "position": pos,
                "report_status": status,   # maps to our report_status
                "practice_status": None,   # not present in this feed
                "designation": designation,
                "body_part": body_part,
                "description": details,
                "date_updated": now_iso
            })

    df = pd.DataFrame(rows, columns=[
        "season","week","team","player_id","player_name","position",
        "report_status","practice_status","designation","body_part","description","date_updated"
    ])
    df.to_csv("nfl_injuries.csv", index=False)
    print(f"[espn_fallback] wrote nfl_injuries.csv with {len(df)} rows for season {season}")

if __name__ == "__main__":
    main()
