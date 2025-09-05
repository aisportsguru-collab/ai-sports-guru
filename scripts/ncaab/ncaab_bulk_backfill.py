#!/usr/bin/env python3
import os, time, json
from tenacity import retry, wait_exponential, stop_after_attempt
from scripts.ncaab.supabase_client import get_client

# import shim: sportsipy preferred; fall back to sportsreference if needed
try:
    from sportsipy.ncaab.teams import Teams
    HAVE_SPORTSIPY = True
except Exception:
    HAVE_SPORTSIPY = False
    from sportsreference.ncaab.teams import Teams  # may not exist in newer envs

sb = get_client()
SPORT = "NCAAB"

SEASONS = [int(s.strip()) for s in os.getenv("NCAAB_SEASONS","2024,2025").split(",") if s.strip()]

def _num(x):
    try: 
        return None if x in ("", None) else float(x)
    except: 
        return None

def upsert_team(name, abbr, ext_id):
    res = sb.table("teams").upsert(
        {"sport": SPORT, "name": name, "abbr": abbr or (name[:3].upper() if name else None), "team_id_external": ext_id},
        on_conflict="sport,name"
    ).execute()
    return res.data[0]["id"]

def upsert_player(ext_id, full, first, last, team_id):
    res = sb.table("players").upsert(
        {"sport": SPORT, "player_id_external": ext_id, "full_name": full, "first_name": first, "last_name": last, "primary_team_id": team_id},
        on_conflict="sport,player_id_external"
    ).execute()
    return res.data[0]["id"]

def as_dict_safe(obj):
    # sportsipy objects can be cast to dict via .dataframe or __dict__ fallbacks
    d = {}
    for k in dir(obj):
        if k.startswith("_"): continue
        try:
            v = getattr(obj, k)
            # skip callables and modules
            if callable(v): continue
            if k in ("dataframe","schedule","roster"): continue
            d[k] = v
        except Exception:
            pass
    return d

def team_payload(season, team):
    # safe pulls (names may differ slightly across lib versions)
    name = getattr(team, "name", None) or getattr(team, "school_name", None)
    abbr = getattr(team, "abbreviation", None) or getattr(team, "abbrev", None)
    ext  = getattr(team, "team_id", None) or getattr(team, "school_id", None) or name
    raw  = as_dict_safe(team)

    return {
        "sport": SPORT,
        "season": season,
        "team_name": name,
        "team_id_external": str(ext),
        "games": getattr(team, "games", None) or getattr(team, "games_played", None),
        "wins": getattr(team, "wins", None),
        "losses": getattr(team, "losses", None),
        "ppg": _num(getattr(team, "points_per_game", None) or getattr(team, "points", None)),
        "opp_ppg": _num(getattr(team, "opp_points_per_game", None) or getattr(team, "points_allowed", None)),
        "pace": _num(getattr(team, "pace", None)),
        "ortg": _num(getattr(team, "offensive_rating", None) or getattr(team, "off_rtg", None)),
        "drtg": _num(getattr(team, "defensive_rating", None) or getattr(team, "def_rtg", None)),
        "srs": _num(getattr(team, "simple_rating_system", None) or getattr(team, "srs", None)),
        "efg_pct": _num(getattr(team, "effective_field_goal_percentage", None) or getattr(team, "efg_percentage", None)),
        "ts_pct": _num(getattr(team, "true_shooting_percentage", None) or getattr(team, "ts_percentage", None)),
        "ftr": _num(getattr(team, "free_throw_attempt_rate", None) or getattr(team, "free_throw_rate", None)),
        "threepa_rate": _num(getattr(team, "three_point_attempt_rate", None) or getattr(team, "three_point_rate", None)),
        "tov_pct": _num(getattr(team, "turnover_percentage", None) or getattr(team, "tov_percentage", None)),
        "orb_pct": _num(getattr(team, "offensive_rebound_percentage", None) or getattr(team, "orb_percentage", None)),
        "drb_pct": _num(getattr(team, "defensive_rebound_percentage", None) or getattr(team, "drb_percentage", None)),
        "stl_pct": _num(getattr(team, "steal_percentage", None) or getattr(team, "stl_percentage", None)),
        "blk_pct": _num(getattr(team, "block_percentage", None) or getattr(team, "blk_percentage", None)),
        "raw": raw,
    }

def player_payload(season, team_name, team_id, p):
    full = getattr(p, "name", None) or (getattr(p,"first_name","") + " " + getattr(p,"last_name","")).strip()
    first = getattr(p, "first_name", None) or (full.split(" ")[0] if full else None)
    last  = getattr(p, "last_name", None) or (" ".join(full.split(" ")[1:]) if full else None)
    ext   = getattr(p, "player_id", None) or full
    raw   = as_dict_safe(p)

    return {
        "sport": SPORT,
        "season": season,
        "team_id": team_id,
        "player_id_external": str(ext),
        "player_name": full,
        "games": getattr(p,"games_played", None) or getattr(p,"games", None),
        "mpg": _num(getattr(p,"minutes_per_game", None) or getattr(p,"mpg", None)),
        "ppg": _num(getattr(p,"points_per_game", None) or getattr(p,"ppg", None)),
        "rpg": _num(getattr(p,"total_rebounds_per_game", None) or getattr(p,"rpg", None)),
        "apg": _num(getattr(p,"assists_per_game", None) or getattr(p,"apg", None)),
        "spg": _num(getattr(p,"steals_per_game", None) or getattr(p,"spg", None)),
        "bpg": _num(getattr(p,"blocks_per_game", None) or getattr(p,"bpg", None)),
        "efg_pct": _num(getattr(p,"effective_field_goal_percentage", None) or getattr(p,"efg_percentage", None)),
        "ts_pct": _num(getattr(p,"true_shooting_percentage", None) or getattr(p,"ts_percentage", None)),
        "usg_pct": _num(getattr(p,"usage_percentage", None) or getattr(p,"usg_percentage", None)),
        "ortg": _num(getattr(p,"offensive_rating", None) or getattr(p,"off_rtg", None)),
        "drtg": _num(getattr(p,"defensive_rating", None) or getattr(p,"def_rtg", None)),
        "raw": raw,
    }

def run_season(season:int):
    print(f"[ncaab] season {season}: fetching teams")
    teams = Teams(season)
    df = teams.dataframes  # triggers load
    added_teams = 0
    added_players = 0

    for t in teams:
        tpay = team_payload(season, t)
        team_id = upsert_team(tpay["team_name"], None, tpay["team_id_external"])
        tpay["team_id"] = team_id

        sb.table("ncaab_team_season_stats").upsert(
            tpay, on_conflict="sport,season,team_id"
        ).execute()
        added_teams += 1

        # roster + players
        try:
            roster = t.roster
        except Exception as e:
            print(f"[ncaab]   warn: roster load failed for {tpay['team_name']}: {e}")
            continue

        for p in roster:
            ppay = player_payload(season, tpay["team_name"], team_id, p)
            # upsert player entity
            pid = upsert_player(ppay["player_id_external"], ppay["player_name"], ppay.get("player_name","").split(" ")[0], " ".join((ppay.get("player_name","")+" ").split(" ")[1:]).strip(), team_id)
            ppay["player_id"] = pid
            sb.table("ncaab_player_season_stats").upsert(
                ppay, on_conflict="sport,season,player_id"
            ).execute()
            added_players += 1
        time.sleep(0.05)

    print(f"[ncaab] season {season} done. teams:{added_teams} players:{added_players}")

if __name__ == "__main__":
    before_t = sb.table("ncaab_team_season_stats").select("id", count="exact").eq("sport","NCAAB").execute().count or 0
    before_p = sb.table("ncaab_player_season_stats").select("id", count="exact").eq("sport","NCAAB").execute().count or 0
    for s in SEASONS:
        run_season(s)
    after_t = sb.table("ncaab_team_season_stats").select("id", count="exact").eq("sport","NCAAB").execute().count or 0
    after_p = sb.table("ncaab_player_season_stats").select("id", count="exact").eq("sport","NCAAB").execute().count or 0
    added_t = (after_t or 0) - (before_t or 0)
    added_p = (after_p or 0) - (before_p or 0)
    print(f"[ncaab] backfill complete. +teams:{added_t} +players:{added_p}")
    if added_t <= 0 and added_p <= 0:
        raise SystemExit("[ncaab] ERROR: 0 rows added. Check network or sportsipy import.")
