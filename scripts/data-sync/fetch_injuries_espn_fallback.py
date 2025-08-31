#!/usr/bin/env python3
import os, time, sys, requests, pandas as pd
from datetime import datetime, timezone

S = requests.Session()
S.headers.update({"User-Agent": "Mozilla/5.0 AiSportsGuru/1.0"})

def season_from_env():
    env = os.getenv("INJURY_SEASONS")
    if env:
        try:
            seasons = sorted(set(int(s.strip()) for s in env.split(",") if s.strip()))
            return max(seasons)
        except Exception:
            pass
    now = datetime.now(timezone.utc)
    return now.year if now.month >= 9 else now.year - 1

def j(url, params=None, tries=3, backoff=0.6):
    for i in range(tries):
        r = S.get(url, params=params, timeout=20)
        if r.status_code == 200:
            return r.json()
        time.sleep(backoff * (i+1))
    r.raise_for_status()

def as_text(x):
    if x is None:
        return None
    if isinstance(x, str):
        return x
    if isinstance(x, dict):
        # ESPN varies; try common fields
        for k in ("description", "shortText", "text", "detail", "status"):
            v = x.get(k)
            if isinstance(v, str) and v.strip():
                return v
        # last resort: join values
        try:
            return " ".join(str(v) for v in x.values() if v)
        except Exception:
            return None
    if isinstance(x, (list, tuple)):
        try:
            return " ".join(as_text(y) or "" for y in x).strip() or None
        except Exception:
            return None
    return str(x)

def main():
    season = season_from_env()
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
            # athlete fields
            ath = item.get("athlete", {}) or {}
            name = ath.get("displayName")
            pos  = (ath.get("position") or {}).get("abbreviation")

            # status / details / type can be strings or dicts
            status_raw  = item.get("status")
            details_raw = item.get("details")
            type_raw    = item.get("type")

            status  = as_text(status_raw)
            details = as_text(details_raw)
            body_part = None
            if isinstance(type_raw, dict):
                body_part = type_raw.get("text") or type_raw.get("abbreviation")
            else:
                body_part = as_text(type_raw)

            # derive designation hints
            designation = None
            st = (status or "").upper()
            dt = (details or "").upper()
            if "IR" in st or "INJURED RESERVE" in st or "IR" in dt:
                designation = "IR"
            elif "PUP" in st or "PHYSICALLY UNABLE" in st or "PUP" in dt:
                designation = "PUP"

            rows.append({
                "season": season,
                "week": 0,                 # ESPN feed not by game week
                "team": team,
                "player_id": None,         # ESPN feed here lacks stable id
                "player_name": name,
                "position": pos,
                "report_status": status,   # Out, Questionable, etc.
                "practice_status": None,   # not provided here
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
