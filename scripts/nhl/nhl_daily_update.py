#!/usr/bin/env python3
import time, requests
from datetime import datetime, timedelta
from dateutil import tz
from tenacity import retry, wait_exponential, stop_after_attempt
from supabase_client import get_client

SPORT="NHL"
sb = get_client()

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (compatible; AiSportsGuru/1.0)"})

@retry(wait=wait_exponential(multiplier=1, min=1, max=10), stop=stop_after_attempt(6))
def http_json(url: str):
    r = SESSION.get(url, timeout=30)
    r.raise_for_status()
    return r.json()

def safe_get(d, *keys, default=None):
    for k in keys:
        if not isinstance(d, dict) or k not in d: return default
        d = d[k]
    return d

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
        "sport": SPORT, "provider_game_id": str(game_pk), "season": season_int, "week": 0,
        "game_date": date_iso, "home_team": home_name, "away_team": away_name,
        "home_score": _to_int(home_score), "away_score": _to_int(away_score), "status": status
    }, on_conflict="sport,provider_game_id").execute()
    return res.data[0]["id"]

def upsert_team(name, abbr, ext_id):
    r = sb.table("teams").upsert({"sport": SPORT,"name": name,"abbr": abbr,"team_id_external": str(ext_id)},
                                 on_conflict="sport,name").execute()
    return r.data[0]["id"]

def upsert_team_stats(game_id, team_id, ts, opp_score=None):
    payload = {
        "sport": SPORT, "game_id": game_id, "team_id": team_id,
        "goals_for": _to_int(ts.get("goals")), "goals_against": _to_int(opp_score),
        "shots_for": _to_int(ts.get("shots")), "shots_against": None,
        "pim": _to_int(ts.get("pim")), "hits_for": _to_int(ts.get("hits")), "blocks": _to_int(ts.get("blocked")),
        "giveaways": _to_int(ts.get("giveaways")), "takeaways": _to_int(ts.get("takeaways")),
        "faceoff_win_pct": _to_float(ts.get("faceOffWinPercentage") or ts.get("foPct")),
        "pp_goals": _to_int(ts.get("powerPlayGoals") or ts.get("ppGoals")),
        "pp_opportunities": _to_int(ts.get("powerPlayOpportunities") or ts.get("ppOpps")),
        "sh_goals": None, "corsi_for": None, "corsi_against": None, "fenwick_for": None, "fenwick_against": None,
        "xg_for": None, "xg_against": None
    }
    sb.table("team_game_stats").upsert(payload, on_conflict="sport,game_id,team_id").execute()

def upsert_player(game_id, team_id, player_id_db, skater_stats=None, goalie_stats=None):
    if goalie_stats is not None:
        payload = {
            "sport": SPORT, "game_id": game_id, "team_id": team_id, "player_id": player_id_db,
            "goals": 0, "assists": 0, "points": 0, "shots": 0, "hits": 0, "blocks": 0,
            "pim": 0, "plus_minus": None, "toi": goalie_stats.get("timeOnIce") or goalie_stats.get("toi"),
            "goalie_sa": _to_int(goalie_stats.get("shots") or goalie_stats.get("shotsAgainst")),
            "goalie_sv": _to_int(goalie_stats.get("saves")),
            "goalie_ga": _to_int(goalie_stats.get("goalsAgainst")),
            "goalie_decision": goalie_stats.get("decision"),
            "xg": None
        }
    else:
        payload = {
            "sport": SPORT, "game_id": game_id, "team_id": team_id, "player_id": player_id_db,
            "goals": _to_int(skater_stats.get("goals")), "assists": _to_int(skater_stats.get("assists")),
            "points": _to_int((_to_int(skater_stats.get("goals")) or 0)+(_to_int(skater_stats.get("assists")) or 0)),
            "shots": _to_int(skater_stats.get("shots")), "hits": _to_int(skater_stats.get("hits")),
            "blocks": _to_int(skater_stats.get("blocked")), "pim": _to_int(skater_stats.get("penaltyMinutes") or skater_stats.get("pim")),
            "plus_minus": _to_int(skater_stats.get("plusMinus")), "toi": skater_stats.get("timeOnIce") or skater_stats.get("toi"),
            "goalie_sa": None, "goalie_sv": None, "goalie_ga": None, "goalie_decision": None, "xg": None
        }
    sb.table("player_game_stats").upsert(payload, on_conflict="sport,game_id,player_id").execute()

def get_or_create_player(pid_ext, full, first, last, team_id):
    r = sb.table("players").select("id").eq("sport", SPORT).eq("player_id_external", str(pid_ext)).limit(1).execute()
    if r.data: return r.data[0]["id"]
    return sb.table("players").upsert({
        "sport": SPORT, "player_id_external": str(pid_ext), "full_name": full,
        "first_name": first, "last_name": last, "primary_team_id": team_id
    }, on_conflict="sport,player_id_external").execute().data[0]["id"]

def schedule_for_day(day_iso):
    # Try StatsAPI
    try:
        j = http_json(f"https://statsapi.web.nhl.com/api/v1/schedule?startDate={day_iso}&endDate={day_iso}")
        blocks = []
        for d in j.get("dates", []):
            games = []
            for g in d.get("games", []):
                games.append({
                    "gamePk": g["gamePk"],
                    "status": safe_get(g,"status","detailedState","scheduled"),
                    "home": {"id": safe_get(g,"teams","home","team","id"),
                             "name": safe_get(g,"teams","home","team","name"),
                             "triCode": None, "score": safe_get(g,"teams","home","score")},
                    "away": {"id": safe_get(g,"teams","away","team","id"),
                             "name": safe_get(g,"teams","away","team","name"),
                             "triCode": None, "score": safe_get(g,"teams","away","score")},
                    "from": "statsapi"
                })
            blocks.append({"date": d["date"], "games": games})
        if blocks: return blocks
    except Exception:
        pass
    # Fallback api-web
    try:
        j = http_json(f"https://api-web.nhle.com/v1/scoreboard/{day_iso}")
        games = []
        for g in j.get("games", []):
            games.append({
                "gamePk": str(g.get("id")),
                "status": g.get("gameState") or "scheduled",
                "home": {"id": safe_get(g,"homeTeam","id"), "name": safe_get(g,"homeTeam","name"),
                         "triCode": safe_get(g,"homeTeam","abbrev"), "score": safe_get(g,"homeTeam","score")},
                "away": {"id": safe_get(g,"awayTeam","id"), "name": safe_get(g,"awayTeam","name"),
                         "triCode": safe_get(g,"awayTeam","abbrev"), "score": safe_get(g,"awayTeam","score")},
                "from": "apiweb"
            })
        return [{"date": day_iso, "games": games}]
    except Exception as e:
        print(f"[nhl] warning: schedule fetch failed for {day_iso}: {e}")
        return []

def get_boxscore(game_pk: str, source: str):
    if source == "statsapi":
        try:
            return http_json(f"https://statsapi.web.nhl.com/api/v1/game/{game_pk}/boxscore"), "statsapi"
        except Exception:
            pass
    # fallback api-web
    try:
        j = http_json(f"https://api-web.nhle.com/v1/gamecenter/{game_pk}/boxscore")
        # normalize minimal fields into statsapi-like shape
        from_bulk = {
            "home": "home", "away": "away"
        }
        # Re-use bulk parser from earlier by emulating shape:
        def parse_apiweb_box(box):
            out = {"teams": {"home": {}, "away": {}}}
            for side in ("home","away"):
                t = box.get(side, {})
                out["teams"][side] = {
                    "team": {"id": safe_get(t,"team","id"), "triCode": safe_get(t,"team","abbrev")},
                    "teamStats": {"teamSkaterStats": {
                        "goals": safe_get(t,"teamStats","goals"),
                        "shots": safe_get(t,"teamStats","sog"),
                        "pim": safe_get(t,"teamStats","pim"),
                        "hits": safe_get(t,"teamStats","hits"),
                        "blocked": safe_get(t,"teamStats","blocks"),
                        "giveaways": safe_get(t,"teamStats","giveaways"),
                        "takeaways": safe_get(t,"teamStats","takeaways"),
                        "faceOffWinPercentage": safe_get(t,"teamStats","foPct"),
                        "powerPlayGoals": safe_get(t,"teamStats","ppGoals"),
                        "powerPlayOpportunities": safe_get(t,"teamStats","ppOpps"),
                    }},
                    "players": {}
                }
                for sk in (t.get("skaters") or []):
                    pid = sk.get("playerId")
                    if not pid: continue
                    key = f"ID{pid}"
                    out["teams"][side]["players"][key] = {
                        "person": {"id": pid, "fullName": sk.get("name")},
                        "position": {"code": sk.get("positionCode","")},
                        "stats": {"skaterStats": {
                            "goals": sk.get("goals"), "assists": sk.get("assists"),
                            "shots": sk.get("shots"), "hits": sk.get("hits"),
                            "blocked": sk.get("blocked"), "penaltyMinutes": sk.get("pim"),
                            "plusMinus": sk.get("plusMinus"), "timeOnIce": sk.get("toi"),
                        }}
                    }
                for gk in (t.get("goalies") or []):
                    pid = gk.get("playerId")
                    if not pid: continue
                    key = f"ID{pid}"
                    out["teams"][side]["players"][key] = {
                        "person": {"id": pid, "fullName": gk.get("name")},
                        "position": {"code": "G"},
                        "stats": {"goalieStats": {
                            "timeOnIce": gk.get("toi"), "shots": gk.get("shotsAgainst"),
                            "saves": gk.get("saves"), "goalsAgainst": gk.get("goalsAgainst"),
                            "decision": gk.get("decision"),
                        }}
                    }
            return out
        return parse_apiweb_box(j), "apiweb"
    except Exception as e:
        print(f"[nhl] warning: boxscore fetch failed for game {game_pk}: {e}")
        return None, "none"

def run_daily():
    tz_ny = tz.gettz("America/New_York")
    today = datetime.now(tz_ny).date()
    for delta in [-1, 0]:
        day = today + timedelta(days=delta)
        blocks = schedule_for_day(day.isoformat())
        for d in blocks:
            for g in d.get("games", []):
                game_pk = g["gamePk"]
                if game_exists(game_pk): 
                    continue
                home_name, away_name = g["home"]["name"], g["away"]["name"]
                home_abbr, away_abbr = g["home"]["triCode"], g["away"]["triCode"]
                home_id_ext, away_id_ext = g["home"]["id"], g["away"]["id"]
                status = g["status"]
                season_int = day.year  # rough; regular season start is Oct (OK for storage)

                box, source = get_boxscore(game_pk, g.get("from","statsapi"))
                if not box: 
                    continue

                # teams
                home_tid = upsert_team(home_name, home_abbr or (home_name[:3].upper() if home_name else None), home_id_ext)
                away_tid = upsert_team(away_name, away_abbr or (away_name[:3].upper() if away_name else None), away_id_ext)

                home_score, away_score = g["home"].get("score"), g["away"].get("score")
                game_id = upsert_game(game_pk, day.isoformat(), home_name, away_name, home_score, away_score, status, season_int)

                # team stats
                hts = safe_get(box,"teams","home","teamStats","teamSkaterStats", default={})
                ats = safe_get(box,"teams","away","teamStats","teamSkaterStats", default={})
                upsert_team_stats(game_id, home_tid, hts, opp_score=away_score)
                upsert_team_stats(game_id, away_tid, ats, opp_score=home_score)

                # players
                for side, tid in [("home", home_tid), ("away", away_tid)]:
                    players = safe_get(box,"teams",side,"players", default={})
                    for key, p in players.items():
                        per = p.get("person",{}) or {}
                        full = per.get("fullName") or ""
                        first = (full.split(" ") or [""])[0]
                        last  = " ".join(full.split(" ")[1:]) if full else ""
                        pid_ext = per.get("id")
                        if pid_ext is None: continue
                        pdb = get_or_create_player(pid_ext, full, first, last, tid)
                        if (p.get("position",{}) or {}).get("code") == "G":
                            gstats = safe_get(p,"stats","goalieStats", default={})
                            if gstats: upsert_player(game_id, tid, pdb, goalie_stats=gstats)
                        else:
                            sk = safe_get(p,"stats","skaterStats", default={})
                            if sk: upsert_player(game_id, tid, pdb, skater_stats=sk)
                time.sleep(0.15)

if __name__ == "__main__":
    try:
        run_daily()
    except Exception as e:
        print(f"[nhl] warning: daily run aborted: {e}")
    print("NHL daily update complete.")
