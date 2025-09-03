#!/usr/bin/env python3
import time, requests
from datetime import datetime, timedelta
from dateutil import tz
from supabase_client import get_client

SPORT="NHL"
sb = get_client()

def _to_int(x):
    try: return int(float(str(x)))
    except: return None
def _to_float(x):
    try: return float(x)
    except: return None

def game_exists(game_pk):
    r = sb.table("games").select("id").eq("sport", SPORT).eq("provider_game_id", str(game_pk)).limit(1).execute()
    return bool(r.data)

def upsert_game(game_pk, date_iso, home_name, away_name, home_score, away_score, status, season_int):
    res = sb.table("games").upsert({
        "sport": SPORT,
        "provider_game_id": str(game_pk),
        "season": season_int,
        "week": 0,
        "game_date": date_iso,
        "home_team": home_name,
        "away_team": away_name,
        "home_score": _to_int(home_score),
        "away_score": _to_int(away_score),
        "status": status
    }, on_conflict="sport,provider_game_id").execute()
    return res.data[0]["id"]

def upsert_team(name, abbr, ext_id):
    r = sb.table("teams").upsert({"sport": SPORT,"name": name,"abbr": abbr,"team_id_external": str(ext_id)}, on_conflict="sport,name").execute()
    return r.data[0]["id"]

def upsert_team_stats(game_id, team_id, ts, opp_score=None):
    payload = {
        "sport": SPORT, "game_id": game_id, "team_id": team_id,
        "goals_for": _to_int(ts.get("goals")),
        "goals_against": _to_int(opp_score) if opp_score is not None else None,
        "shots_for": _to_int(ts.get("shots")),
        "shots_against": None,
        "pim": _to_int(ts.get("pim")),
        "hits_for": _to_int(ts.get("hits")),
        "blocks": _to_int(ts.get("blocked")),
        "giveaways": _to_int(ts.get("giveaways")),
        "takeaways": _to_int(ts.get("takeaways")),
        "faceoff_win_pct": _to_float(ts.get("faceOffWinPercentage")),
        "pp_goals": _to_int(ts.get("powerPlayGoals")),
        "pp_opportunities": _to_int(ts.get("powerPlayOpportunities")),
        "sh_goals": None,
        "corsi_for": None,"corsi_against": None,"fenwick_for": None,"fenwick_against": None,"xg_for": None,"xg_against": None
    }
    sb.table("team_game_stats").upsert(payload, on_conflict="sport,game_id,team_id").execute()

def upsert_player(game_id, team_id, player_id_db, skater_stats=None, goalie_stats=None):
    if goalie_stats is not None:
        payload = {
            "sport": SPORT, "game_id": game_id, "team_id": team_id, "player_id": player_id_db,
            "goals": 0, "assists": 0, "points": 0, "shots": 0, "hits": 0, "blocks": 0,
            "pim": 0, "plus_minus": None, "toi": goalie_stats.get("timeOnIce"),
            "goalie_sa": _to_int(goalie_stats.get("shots")),
            "goalie_sv": _to_int(goalie_stats.get("saves")),
            "goalie_ga": _to_int(goalie_stats.get("goalsAgainst")),
            "goalie_decision": goalie_stats.get("decision"),
            "xg": None
        }
    else:
        payload = {
            "sport": SPORT, "game_id": game_id, "team_id": team_id, "player_id": player_id_db,
            "goals": _to_int(skater_stats.get("goals")),
            "assists": _to_int(skater_stats.get("assists")),
            "points": _to_int((_to_int(skater_stats.get("goals")) or 0)+(_to_int(skater_stats.get("assists")) or 0)),
            "shots": _to_int(skater_stats.get("shots")),
            "hits": _to_int(skater_stats.get("hits")),
            "blocks": _to_int(skater_stats.get("blocked")),
            "pim": _to_int(skater_stats.get("penaltyMinutes")),
            "plus_minus": _to_int(skater_stats.get("plusMinus")),
            "toi": skater_stats.get("timeOnIce"),
            "goalie_sa": None, "goalie_sv": None, "goalie_ga": None, "goalie_decision": None,
            "xg": None
        }
    sb.table("player_game_stats").upsert(payload, on_conflict="sport,game_id,player_id").execute()

def get_or_create_player(pid_ext, full, first, last, team_id):
    r = sb.table("players").select("id").eq("sport", SPORT).eq("player_id_external", str(pid_ext)).limit(1).execute()
    if r.data: return r.data[0]["id"]
    return sb.table("players").upsert({
        "sport": SPORT, "player_id_external": str(pid_ext),
        "full_name": full, "first_name": first, "last_name": last, "primary_team_id": team_id
    }, on_conflict="sport,player_id_external").execute().data[0]["id"]

def run_daily():
    tz_ny = tz.gettz("America/New_York")
    today = datetime.now(tz_ny).date()
    for delta in [0, -1]:  # today and yesterday
        day = today + timedelta(days=delta)
        resp = requests.get(f"https://statsapi.web.nhl.com/api/v1/schedule?date={day.isoformat()}", timeout=30).json()
        for d in resp.get("dates", []):
            for game in d.get("games", []):
                game_pk = game["gamePk"]
                if game_exists(game_pk): continue
                home_name = game["teams"]["home"]["team"]["name"]
                away_name = game["teams"]["away"]["team"]["name"]
                season_int = int(str(game["season"])[:4])

                box = requests.get(f"https://statsapi.web.nhl.com/api/v1/game/{game_pk}/boxscore", timeout=30).json()
                home_abbr = box["teams"]["home"]["team"].get("triCode") or home_name[:3].upper()
                away_abbr = box["teams"]["away"]["team"].get("triCode") or away_name[:3].upper()
                home_tid = upsert_team(home_name, home_abbr, box["teams"]["home"]["team"]["id"])
                away_tid = upsert_team(away_name, away_abbr, box["teams"]["away"]["team"]["id"])

                status = game.get("status",{}).get("detailedState","scheduled")
                home_score = game["teams"]["home"].get("score")
                away_score = game["teams"]["away"].get("score")
                game_id = upsert_game(game_pk, day.isoformat(), home_name, away_name, home_score, away_score, status, season_int)

                # team stats
                hts = box["teams"]["home"]["teamStats"]["teamSkaterStats"]
                ats = box["teams"]["away"]["teamStats"]["teamSkaterStats"]
                upsert_team_stats(game_id, home_tid, hts, opp_score=away_score)
                upsert_team_stats(game_id, away_tid, ats, opp_score=home_score)

                # players
                for side, tid in [("home", home_tid), ("away", away_tid)]:
                    players = box["teams"][side]["players"]
                    for key in players:
                        p = players[key]
                        per = p.get("person",{})
                        full = per.get("fullName","")
                        first = full.split(" ")[0] if full else ""
                        last = " ".join(full.split(" ")[1:]) if full else ""
                        pid_ext = per.get("id")
                        if pid_ext is None: continue
                        pdb = get_or_create_player(pid_ext, full, first, last, tid)
                        if p.get("position",{}).get("code") == "G":
                            upsert_player(game_id, tid, pdb, goalie_stats=p.get("stats",{}).get("goalieStats",{}))
                        else:
                            sk = p.get("stats",{}).get("skaterStats")
                            if sk: upsert_player(game_id, tid, pdb, skater_stats=sk)

                time.sleep(0.2)

if __name__ == "__main__":
    run_daily()
    print("NHL daily update complete.")
