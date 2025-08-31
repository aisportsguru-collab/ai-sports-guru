#!/usr/bin/env python3
"""
ESPN fallback injuries fetcher for NCAAF (FBS).
- Uses ESPN site APIs:
  * Teams directory:  https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams
  * Team injuries:    https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/{id}/injuries
- Writes /tmp/ncaaf_injuries.csv

Notes:
- ESPN data can be sparse; we keep what’s available.
- We only keep teams that exist in our current FBS set by name matching (normalized).
- Designed as a fallback when CFBD is empty/unavailable.

Env:
  INJURY_SEASONS  (optional; defaults to current year; ESPN does not use year param for endpoint, but we stamp season)
"""
import os, sys, csv, time, json, re
from datetime import datetime
from typing import Dict, Any, List
import requests

TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams"
TEAM_INJ_URL = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/{id}/injuries"

try:
    CY = datetime.utcnow().year
except Exception:
    CY = int(time.strftime("%Y"))
SEASONS = [int(s.strip()) for s in os.getenv("INJURY_SEASONS", str(CY)).split(",") if s.strip().isdigit()] or [CY]
SEASON = max(SEASONS)  # single season stamp on rows

def norm(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', (s or "").lower())

def fetch_json(url, params=None, retries=3, sleep=0.4):
    for i in range(retries):
        r = requests.get(url, params=params or {}, timeout=60)
        if r.status_code == 200:
            try:
                return r.json()
            except Exception:
                return {}
        time.sleep(sleep * (i+1))
    return {}

def current_fbs_name_set() -> set:
    # Pull team directory and gather FBS team names
    js = fetch_json(TEAMS_URL, params={"groups": 80, "limit": 400})  # groups=80 ~ FBS
    names = set()
    for item in (js.get("sports") or []):
        for league in item.get("leagues", []):
            for t in league.get("teams", []):
                team = t.get("team") or {}
                nm = team.get("displayName") or team.get("name") or ""
                if nm:
                    names.add(nm)
    return names

def espn_teams() -> List[Dict[str,Any]]:
    js = fetch_json(TEAMS_URL, params={"groups": 80, "limit": 400})
    out = []
    for item in (js.get("sports") or []):
        for league in item.get("leagues", []):
            for t in league.get("teams", []):
                team = t.get("team") or {}
                out.append({
                    "id": team.get("id"),
                    "displayName": team.get("displayName"),
                    "name": team.get("name"),
                })
    return out

def injuries_for_team(team_id: str) -> List[Dict[str,Any]]:
    js = fetch_json(TEAM_INJ_URL.format(id=team_id))
    ath = (js.get("athletes") or [])
    rows = []
    for a in ath:
        nm = (a.get("athlete") or {}).get("displayName") or ""
        pos = (a.get("athlete") or {}).get("position", {}).get("abbreviation")
        status = (a.get("status") or {}).get("type", {}).get("description") or (a.get("status") or {}).get("status")
        body = (a.get("injury") or {}).get("bodyPart")
        desc = (a.get("injury") or {}).get("detail") or (a.get("injury") or {}).get("description")
        dt   = (a.get("injury") or {}).get("date")  # may be ISO
        rows.append({
            "player_name": nm,
            "position": pos,
            "report_status": status,
            "body_part": body,
            "description": desc,
            "date_updated": dt
        })
    return rows

def main():
    out = "/tmp/ncaaf_injuries.csv"
    fields = ["season","week","team","player_id","player_name","position",
              "report_status","practice_status","designation","body_part",
              "description","source","date_updated"]

    # Build a set of valid FBS names (from ESPN index) for filtering
    fbs_names = current_fbs_name_set()
    fbs_norm = { norm(n): n for n in fbs_names }

    teams = espn_teams()
    rows = []
    for t in teams:
        tid = t.get("id")
        name = t.get("displayName") or t.get("name") or ""
        if not tid or not name:
            continue
        if norm(name) not in fbs_norm:
            continue

        inj = injuries_for_team(tid)
        if not inj:
            continue
        for r in inj:
            if not r.get("player_name"):
                continue
            rows.append({
                "season": SEASON,
                "week": 0,  # ESPN doesn’t split by week; set 0
                "team": name,
                "player_id": None,
                "player_name": r.get("player_name"),
                "position": r.get("position"),
                "report_status": r.get("report_status"),
                "practice_status": None,
                "designation": None,
                "body_part": r.get("body_part"),
                "description": r.get("description"),
                "source": "espn",
                "date_updated": r.get("date_updated") or (datetime.utcnow().isoformat()+"Z")
            })
        time.sleep(0.2)  # be polite

    # De-dupe: (season, week, team, player_name)
    seen = set()
    deduped = []
    for r in rows:
        key = (r["season"], r["week"], r["team"], r["player_name"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(r)

    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in deduped:
            w.writerow(r)

    print(f"Wrote {out} with {len(deduped)} rows (ESPN fallback)")

if __name__ == "__main__":
    main()
