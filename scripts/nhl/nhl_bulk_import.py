#!/usr/bin/env python3
import os, time, math, requests
from datetime import datetime
from dateutil import parser as dtp
from tenacity import retry, wait_fixed, stop_after_attempt
from supabase_client import get_client

SPORT = "NHL"
SEASONS = os.getenv("NHL_SEASONS","20222023,20232024").split(",")  # NHL format
sb = get_client()

def _to_int(x):
    if x is None: return None
    try: return int(float(str(x)))
    except: return None
def _to_float(x):
    if x is None: return None
    try: return float(x)
    except: return None

def upsert_team(name, abbr, ext_id):
    res = sb.table("teams").upsert(
        {"sport": SPORT, "name": name, "abbr": abbr, "team_id_external": str(ext_id)},
        on_conflict="sport,name"
    ).execute()
    return res.data[0]["id"]

def upsert_player(pid_ext, full, first, last, team_id):
    res = sb.table("players").upsert(
        {"sport": SPORT, "player_id_external": str(pid_ext), "full_name": full, "first_name": first, "last_name": last, "primary_team_id": team_id},
        on_conflict="sport,player_id_external"
    ).execute()
    return res.data[0]["id"]

def upsert_game(game_pk, season_int, date_iso, home_name, away_name, home_score, away_score, status):
    res = sb.table("games").upsert(
        {
            "sport": SPORT,
            "provider_game_id": str(game_pk),
            "season": season_int,
            "week": 0,
            "game_date": date_iso,
            "home_team": home_name,
            "away_team": away_name,
            "status": status,
            "home_score": _to_int(home_score),
            "away_score": _to_int(away_score),
        },
        on_conflict="sport,provider_game_id"
    ).execute()
    return res.data[0]["id"]

@retry(wait=wait_fixed(1), stop=stop_after_attempt(3))
def nhl_json(url):
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.json()

def run_season(season_str):
    season_int = int(season_str[:4])  # e.g., 2022
    for gtype, gtype_name in [("R","Regular Season"), ("P","Playoffs")]:
        sched = nhl_json(f"https://statsapi.web.nhl.com/api/v1/schedule?season={season_str}&gameType={gtype}")
        dates = sched.get("dates", [])
        for d in dates:
            date_iso = d["date"]
            for game in d.get("games", []):
                game_pk = game["gamePk"]
                status = game.get("status", {}).get("detailedState","scheduled")
                teams = game.get("teams",{})
                home = teams.get("home",{}).get("team",{})
                away = teams.get("away",{}).get("team",{})
                home_name = home.get("name")
                away_name = away.get("name")
                if not home_name or not away_name:
                    continue

                # pull boxscore for stats
                try:
                    box = nhl_json(f"https://statsapi.web.nhl.com/api/v1/game/{game_pk}/boxscore")
                except Exception:
                    time.sleep(0.4)
                    continue

                # team setup
                home_abbr = box["teams"]["home"]["team"].get("triCode") or home_name[:3].upper()
                away_abbr = box["teams"]["away"]["team"].get("triCode") or away_name[:3].upper()
                home_tid = upsert_team(home_name, home_abbr, box["teams"]["home"]["team"]["id"])
                away_tid = upsert_team(away_name, away_abbr, box["teams"]["away"]["team"]["id"])

                linescore = game.get("linescore", {})
                home_score = linescore.get("teams", {}).get("home", {}).get("goals") or teams.get("home",{}).get("score")
                away_score = linescore.get("teams", {}).get("away", {}).get("goals") or teams.get("away",{}).get("score")

                game_id = upsert_game(
                    game_pk, season_int, date_iso, home_name, away_name, home_score, away_score, status
                )

                # TEAM STATS
                for side, tid in [("home", home_tid), ("away", away_tid)]:
                    ts = box["teams"][side]["teamStats"]["teamSkaterStats"]
                    payload = {
                        "sport": SPORT,
                        "game_id": game_id,
                        "team_id": tid,
                        "goals_for": _to_int(ts.get("goals")),
                        "goals_against": _to_int(home_score if side=="away" else away_score),
                        "shots_for": _to_int(ts.get("shots")),
                        "shots_against": None,  # not in teamSkaterStats; can be derived if needed
                        "pim": _to_int(ts.get("pim")),
                        "hits_for": _to_int(ts.get("hits")),
                        "blocks": _to_int(ts.get("blocked")),
                        "giveaways": _to_int(ts.get("giveaways")),
                        "takeaways": _to_int(ts.get("takeaways")),
                        "faceoff_win_pct": _to_float(ts.get("faceOffWinPercentage")),
                        "pp_goals": _to_int(ts.get("powerPlayGoals")),
                        "pp_opportunities": _to_int(ts.get("powerPlayOpportunities")),
                        "sh_goals": None,
                        "corsi_for": None, "corsi_against": None,
                        "fenwick_for": None, "fenwick_against": None,
                        "xg_for": None, "xg_against": None
                    }
                    sb.table("team_game_stats").upsert(payload, on_conflict="sport,game_id,team_id").execute()

                # PLAYER STATS (skaters)
                for side, tid in [("home", home_tid), ("away", away_tid)]:
                    skaters = box["teams"][side].get("skaters", [])
                    players = box["teams"][side]["players"]
                    for pid_key in players:
                        p = players[pid_key]
                        pdata = p.get("person", {})
                        stats = p.get("stats", {}).get("skaterStats")
                        goalie = p.get("position",{}).get("code") == "G"
                        full = pdata.get("fullName","")
                        first = full.split(" ")[0] if full else ""
                        last = " ".join(full.split(" ")[1:]) if full else ""
                        pid_ext = pdata.get("id")
                        if pid_ext is None: continue
                        player_id_db = upsert_player(pid_ext, full, first, last, tid)

                        if goalie:
                            gstats = p.get("stats", {}).get("goalieStats", {})
                            payload = {
                                "sport": SPORT, "game_id": game_id, "team_id": tid, "player_id": player_id_db,
                                "goals": 0, "assists": 0, "points": 0, "shots": 0, "hits": 0, "blocks": 0,
                                "pim": 0, "plus_minus": None, "toi": gstats.get("timeOnIce"),
                                "goalie_sa": _to_int(gstats.get("shots")),
                                "goalie_sv": _to_int(gstats.get("saves")),
                                "goalie_ga": _to_int(gstats.get("goalsAgainst")),
                                "goalie_decision": gstats.get("decision"),
                                "xg": None
                            }
                        else:
                            if not stats:
                                continue
                            payload = {
                                "sport": SPORT, "game_id": game_id, "team_id": tid, "player_id": player_id_db,
                                "goals": _to_int(stats.get("goals")),
                                "assists": _to_int(stats.get("assists")),
                                "points": _to_int((_to_int(stats.get("goals")) or 0) + (_to_int(stats.get("assists")) or 0)),
                                "shots": _to_int(stats.get("shots")),
                                "hits": _to_int(stats.get("hits")),
                                "blocks": _to_int(stats.get("blocked")),
                                "pim": _to_int(stats.get("penaltyMinutes")),
                                "plus_minus": _to_int(stats.get("plusMinus")),
                                "toi": stats.get("timeOnIce"),
                                "goalie_sa": None, "goalie_sv": None, "goalie_ga": None, "goalie_decision": None,
                                "xg": None
                            }
                        sb.table("player_game_stats").upsert(payload, on_conflict="sport,game_id,player_id").execute()

                time.sleep(0.2)  # be nice to API
            time.sleep(0.2)

if __name__ == "__main__":
    for s in SEASONS:
        run_season(s)
    print("NHL bulk import complete.")
