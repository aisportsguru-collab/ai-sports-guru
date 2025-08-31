#!/usr/bin/env python3
"""
Fetch NCAAF (FBS) team + player season stats for the seasons in $SEASONS
(defaults to current year) using the CollegeFootballData API.

- Uses a tiny on-disk cache (~$HOME/.cache/aisg-cfbd) with TTL:
  * current season: short TTL (6–48h depending on endpoint)
  * past seasons: long TTL (21 days)
- Writes two CSVs:
  * /tmp/ncaaf_teams.csv
  * /tmp/ncaaf_players.csv

Env:
  CFBD_API_KEY   (required)
  SEASONS        e.g. "2023,2024,2025"  (optional; defaults to current year)
  CFBD_CACHE_DIR override cache dir (optional)
"""

import os
import time
import csv
import sys
import requests
from collections import defaultdict
from datetime import datetime

# --- dynamic import of local cache helper (no need for package installs) ---
import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE_HELPER = HERE / "util" / "http_cache.py"
if not CACHE_HELPER.exists():
    # minimal fallback cache (NOP) if helper isn't present
    def get_cached(url, params=None, ttl_seconds=86400):  # noqa: F401
        return None
    def set_cached(url, params, data):  # noqa: F401
        return
else:
    spec = importlib.util.spec_from_file_location("http_cache", str(CACHE_HELPER))
    http_cache = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(http_cache)
    get_cached = http_cache.get_cached
    set_cached = http_cache.set_cached

# --- config ---
API = "https://api.collegefootballdata.com"
KEY = os.getenv("CFBD_API_KEY")

# Seasons from env or default to current year
try:
    current_year = datetime.now().year
except Exception:
    current_year = int(time.strftime("%Y"))
SEASONS = [int(s.strip()) for s in os.getenv("SEASONS", str(current_year)).split(",") if s.strip().isdigit()] or [current_year]

HEADERS = {"Authorization": f"Bearer {KEY}"} if KEY else {}

# --- helpers ---
def die(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)

def get(url, params=None, ttl=None, retries=4):
    """GET with optional cache + simple retry backoff."""
    if ttl:
        c = get_cached(url, params or {}, ttl)
        if c is not None:
            return c
    last = None
    for i in range(retries):
        r = requests.get(url, params=params or {}, headers=HEADERS, timeout=60)
        if r.status_code == 200:
            data = r.json()
            if ttl:
                set_cached(url, params or {}, data)
            return data
        last = r
        time.sleep(1 + i)
    # if we get here, fail with context
    if last is not None and last.status_code == 401:
        die("401 Unauthorized from CFBD. Is CFBD_API_KEY set and valid?")
    if last is not None:
        die(f"CFBD request failed {last.status_code}: {last.text[:200]}...")
    die("CFBD request failed.")

def fnum(x):
    try:
        if x is None or x == "":
            return None
        return float(x)
    except Exception:
        return None

def fetch_team_info(season: int):
    # Longer TTL for past seasons, shorter for current
    ttl = 60*60*24*21 if season < max(SEASONS) else 60*60*24*2
    teams = get(f"{API}/teams/fbs", params={"year": season}, ttl=ttl)
    info = {}
    for t in teams:
        info[t.get("school")] = {
            "team_id": t.get("id"),
            "conference": t.get("conference"),
            "division": t.get("division"),
        }
    return info

def fetch_team_season_stats(season: int):
    info = fetch_team_info(season)
    rows = defaultdict(lambda: {
        "season": season, "team": None, "team_id": None, "conference": None, "division": None,
        "games": None,
        "points_for": None, "points_against": None,
        "yards_offense": None, "yards_passing_offense": None, "yards_rushing_offense": None,
        "first_downs_offense": None, "turnovers_lost": None,
        "yards_defense_allowed": None, "yards_passing_defense_allowed": None, "yards_rushing_defense_allowed": None,
        "sacks_defense": None, "interceptions_defense": None, "takeaways": None,
        "third_down_offense_pct": None, "third_down_defense_pct": None,
        "red_zone_offense_pct": None, "red_zone_defense_pct": None,
        "time_of_possession_sec": None
    })

    ttl_stats = 60*60*24*21 if season < max(SEASONS) else 60*60*24*2
    stats = get(f"{API}/stats/season", params={"year": season}, ttl=ttl_stats)
    for s in stats:
        team = s.get("team")
        if not team:
            continue
        cat = s.get("category")
        val = fnum(s.get("stat"))
        r = rows[team]
        r["team"] = team
        r["conference"] = info.get(team, {}).get("conference")
        r["division"] = info.get(team, {}).get("division")
        r["team_id"] = info.get(team, {}).get("team_id")
        if cat == "scoringOffense": r["points_for"] = val
        if cat == "scoringDefense": r["points_against"] = val
        if cat == "totalOffense": r["yards_offense"] = val
        if cat == "rushingOffense": r["yards_rushing_offense"] = val
        if cat == "passingOffense": r["yards_passing_offense"] = val
        if cat == "firstDowns": r["first_downs_offense"] = val
        if cat == "turnovers": r["turnovers_lost"] = val
        if cat == "totalDefense": r["yards_defense_allowed"] = val
        if cat == "rushingDefense": r["yards_rushing_defense_allowed"] = val
        if cat == "passingDefense": r["yards_passing_defense_allowed"] = val
        if cat == "sacks": r["sacks_defense"] = val
        if cat == "interceptions": r["interceptions_defense"] = val
        if cat == "turnoverMargin": r["takeaways"] = val  # proxy; refine if dedicated takeaways provided
        if cat == "thirdDownOffense": r["third_down_offense_pct"] = val
        if cat == "thirdDownDefense": r["third_down_defense_pct"] = val
        if cat == "redZoneOffense": r["red_zone_offense_pct"] = val
        if cat == "redZoneDefense": r["red_zone_defense_pct"] = val
        if cat == "timeOfPossession": r["time_of_possession_sec"] = val

    # games played via schedule count
    ttl_games = 60*60*24*21 if season < max(SEASONS) else 60*60*6
    games = get(f"{API}/games", params={"year": season, "division": "fbs"}, ttl=ttl_games)
    played = defaultdict(int)
    for g in games:
        if g.get("home_team"): played[g["home_team"]] += 1
        if g.get("away_team"): played[g["away_team"]] += 1
    for team, gp in played.items():
        if team in rows:
            rows[team]["games"] = gp
    return list(rows.values())

def fetch_player_season_category(season: int, category: str):
    # longer TTL for past seasons
    ttl = 60*60*24*21 if season < max(SEASONS) else 60*60*24
    js = get(f"{API}/stats/player/season", params={"year": season, "category": category}, ttl=ttl)
    out = []
    for r in js:
        out.append({
            "season": season,
            "team": r.get("team"),
            "player_id": r.get("id"),
            "player_name": r.get("player"),
            "position": r.get("position"),
            "class": r.get("class"),
            "games": r.get("games"),
            "category": category,
            "stat": r.get("statType"),
            "value": r.get("stat")
        })
    return out

def merge_player_wide(rows):
    by = defaultdict(lambda: {
        "season": None,"team": None,"player_id": None,"player_name": None,"position": None,"class": None,"games": None,
        "pass_att": None,"pass_cmp": None,"pass_yds": None,"pass_td": None,"pass_int": None,"pass_sacks": None,"pass_ypa": None,"pass_rating": None,
        "rush_att": None,"rush_yds": None,"rush_td": None,"rush_ypa": None,
        "rec_rec": None,"rec_tgt": None,"rec_yds": None,"rec_td": None,"rec_ypr": None,
        "def_tackles_total": None,"def_tackles_solo": None,"def_tfl": None,"def_sacks": None,"def_pd": None,"def_int": None,"def_ff": None,"def_fr": None,
        "kick_fgm": None,"kick_fga": None,"kick_xpm": None,"kick_xpa": None,"punt_avg": None,"punt_ct": None,
        "team_id": None
    })
    statmap = {
        "att": ["rush_att", "pass_att"],
        "cmp": ["pass_cmp"],
        "yds": ["pass_yds", "rush_yds", "rec_yds"],
        "td": ["pass_td", "rush_td", "rec_td"],
        "int": ["pass_int", "def_int"],
        "sacks": ["pass_sacks", "def_sacks"],
        "rating": ["pass_rating"],
        "ypa": ["pass_ypa", "rush_ypa"],
        "rec": ["rec_rec"],
        "tgt": ["rec_tgt"],
        "ypr": ["rec_ypr"],
        "tackles": ["def_tackles_total"],
        "solo": ["def_tackles_solo"],
        "tfl": ["def_tfl"],
        "pd": ["def_pd"],
        "ff": ["def_ff"],
        "fr": ["def_fr"],
        "fgm": ["kick_fgm"],
        "fga": ["kick_fga"],
        "xpm": ["kick_xpm"],
        "xpa": ["kick_xpa"],
        "puntAvg": ["punt_avg"],
        "punt": ["punt_ct"]
    }
    for r in rows:
        key = (r["season"], r["team"], r["player_name"])
        row = by[key]
        row["season"] = r["season"]
        row["team"] = r["team"]
        row["player_id"] = r["player_id"]
        row["player_name"] = r["player_name"]
        row["position"] = r["position"]
        row["class"] = r["class"]
        try:
            row["games"] = int(r["games"]) if r.get("games") is not None else None
        except Exception:
            pass
        st = r.get("stat")
        val = fnum(r.get("value"))
        cat = r.get("category")
        if not st:
            continue
        cols = statmap.get(st)
        if not cols:
            continue
        if len(cols) == 1:
            target = cols[0]
        else:
            if cat == "passing":
                target = [c for c in cols if c.startswith("pass_")][0]
            elif cat == "rushing":
                target = [c for c in cols if c.startswith("rush_")][0]
            elif cat == "receiving":
                target = [c for c in cols if c.startswith("rec_") or c.endswith("ypr")][0]
            elif cat == "defensive":
                target = [c for c in cols if c.startswith("def_")] or cols
                target = target[0]
            else:
                target = cols[0]
        row[target] = val
    return list(by.values())

def write_csv(path, rows, fields):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k) for k in fields})

def main():
    if not KEY:
        die("CFBD_API_KEY is not set. Export it and rerun, e.g.:\n  export CFBD_API_KEY=YOUR_KEY")

    os.makedirs("/tmp", exist_ok=True)

    # --- Teams ---
    team_rows = []
    for yr in SEASONS:
        team_rows.extend(fetch_team_season_stats(yr))
    team_fields = [
        "season","team","team_id","conference","division","games",
        "points_for","points_against",
        "yards_offense","yards_passing_offense","yards_rushing_offense","first_downs_offense","turnovers_lost",
        "yards_defense_allowed","yards_passing_defense_allowed","yards_rushing_defense_allowed",
        "sacks_defense","interceptions_defense","takeaways",
        "third_down_offense_pct","third_down_defense_pct",
        "red_zone_offense_pct","red_zone_defense_pct",
        "time_of_possession_sec"
    ]
    write_csv("/tmp/ncaaf_teams.csv", team_rows, team_fields)

    # --- Players (wide) ---
    player_long = []
    for yr in SEASONS:
        for cat in ["passing","rushing","receiving","defensive","kicking","punting"]:
            try:
                player_long.extend(fetch_player_season_category(yr, cat))
            except requests.HTTPError:
                continue
    player_rows = merge_player_wide(player_long)
    player_fields = [
        "season","team","player_id","player_name","position","class","games",
        "pass_att","pass_cmp","pass_yds","pass_td","pass_int","pass_sacks","pass_ypa","pass_rating",
        "rush_att","rush_yds","rush_td","rush_ypa",
        "rec_rec","rec_tgt","rec_yds","rec_td","rec_ypr",
        "def_tackles_total","def_tackles_solo","def_tfl","def_sacks","def_pd","def_int","def_ff","def_fr",
        "kick_fgm","kick_fga","kick_xpm","kick_xpa","punt_avg","punt_ct",
        "team_id"
    ]
    write_csv("/tmp/ncaaf_players.csv", player_rows, player_fields)

    print("Wrote /tmp/ncaaf_teams.csv and /tmp/ncaaf_players.csv")

if __name__ == "__main__":
    main()
