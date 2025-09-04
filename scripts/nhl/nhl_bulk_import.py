#!/usr/bin/env python3
"""
NHL bulk backfill for last two seasons (or seasons via NHL_SEASONS).
- Tries StatsAPI first; if DNS/conn fails, falls back to api-web.nhle.com.
- Month-by-month windows (Oct..Jul) to keep payloads small.
- Robust HTTP: Session + UA + exponential retries.
- Upserts: games, team_game_stats, player_game_stats.
- Progress logs + safety check (error if 0 new games added).
"""

import os, time, requests
from datetime import date, timedelta
from calendar import monthrange
from tenacity import retry, wait_exponential, stop_after_attempt
from supabase_client import get_client

SPORT = "NHL"
SEASONS = [s.strip() for s in os.getenv("NHL_SEASONS", "20222023,20232024").split(",") if s.strip()]
sb = get_client()

# ---------------- HTTP helpers ----------------
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

# ---------------- type helpers ----------------
def _to_int(x):
    if x is None: return None
    try: return int(float(str(x)))
    except: return None

def _to_float(x):
    if x is None: return None
    try: return float(x)
    except: return None

# ---------------- DB helpers ----------------
def upsert_team(name, abbr, ext_id):
    res = sb.table("teams").upsert(
        {"sport": SPORT, "name": name, "abbr": abbr, "team_id_external": str(ext_id)},
        on_conflict="sport,name"
    ).execute()
    return res.data[0]["id"]

def upsert_player(pid_ext, full, first, last, team_id):
    res = sb.table("players").upsert(
        {"sport": SPORT, "player_id_external": str(pid_ext), "full_name": full,
         "first_name": first, "last_name": last, "primary_team_id": team_id},
        on_conflict="sport,player_id_external"
    ).execute()
    return res.data[0]["id"]

def upsert_game(game_pk, season_int, date_iso, home_name, away_name, home_score, away_score, status):
    res = sb.table("games").upsert(
        {"sport": SPORT, "provider_game_id": str(game_pk), "season": season_int, "week": 0,
         "game_date": date_iso, "home_team": home_name, "away_team": away_name,
         "status": status, "home_score": _to_int(home_score), "away_score": _to_int(away_score)},
        on_conflict="sport,provider_game_id"
    ).execute()
    return res.data[0]["id"]

# ---------------- schedule windows ----------------
def season_month_ranges(season_str: str):
    y1 = int(season_str[:4]); y2 = int(season_str[4:])
    months = []
    for m in [10,11,12]:
        months.append((date(y1,m,1), date(y1,m,monthrange(y1,m)[1])))
    for m in [1,2,3,4,5,6,7]:
        months.append((date(y2,m,1), date(y2,m,monthrange(y2,m)[1])))
    return months

# ---------------- providers ----------------
def fetch_schedule_statsapi(start_d: date, end_d: date, gtype: str):
    url = f"https://statsapi.web.nhl.com/api/v1/schedule?startDate={start_d.isoformat()}&endDate={end_d.isoformat()}&gameType={gtype}"
    return http_json(url)

def fetch_schedule_apiweb_day(day: date):
    # scoreboard is per day
    url = f"https://api-web.nhle.com/v1/scoreboard/{day.isoformat()}"
    return http_json(url)

def fetch_boxscore_statsapi(game_pk: str):
    url = f"https://statsapi.web.nhl.com/api/v1/game/{game_pk}/boxscore"
    return http_json(url)

def fetch_boxscore_apiweb(game_id: str):
    url = f"https://api-web.nhle.com/v1/gamecenter/{game_id}/boxscore"
    return http_json(url)

# ---------------- mapping api-web -> common ----------------
def parse_apiweb_games(day_json):
    games = []
    for g in day_json.get("games", []):
        gid = g.get("id")
        if not gid: continue
        home = g.get("homeTeam") or {}
        away = g.get("awayTeam") or {}
        games.append({
            "gamePk": str(gid),
            "gameDate": g.get("gameDate"),
            "status": g.get("gameState") or g.get("gameType") or "scheduled",
            "home": {"id": home.get("id"), "name": home.get("name"), "triCode": home.get("abbrev"), "score": home.get("score")},
            "away": {"id": away.get("id"), "name": away.get("name"), "triCode": away.get("abbrev"), "score": away.get("score")},
        })
    return games

def parse_apiweb_boxscore(box):
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
        # players
        for sk in (t.get("skaters") or []):
            pid = sk.get("playerId")
            if not pid: continue
            key = f"ID{pid}"
            out["teams"][side]["players"][key] = {
                "person": {"id": pid, "fullName": sk.get("name")},
                "position": {"code": sk.get("positionCode","")},
                "stats": {"skaterStats": {
                    "goals": sk.get("goals"),
                    "assists": sk.get("assists"),
                    "shots": sk.get("shots"),
                    "hits": sk.get("hits"),
                    "blocked": sk.get("blocked"),
                    "penaltyMinutes": sk.get("pim"),
                    "plusMinus": sk.get("plusMinus"),
                    "timeOnIce": sk.get("toi"),
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
                    "timeOnIce": gk.get("toi"),
                    "shots": gk.get("shotsAgainst"),
                    "saves": gk.get("saves"),
                    "goalsAgainst": gk.get("goalsAgainst"),
                    "decision": gk.get("decision"),
                }}
            }
    return out

# ---------------- main runner ----------------
def run_season(season_str: str):
    season_int = int(season_str[:4])
    added_games = 0
    for gtype in ("R","P"):
        label = "Regular" if gtype=="R" else "Playoffs"
        print(f"[nhl]  -> {season_str} [{label}]")
        for (start_d, end_d) in season_month_ranges(season_str):
            print(f"[nhl]     window {start_d}..{end_d}")
            # Try StatsAPI first
            use_apiweb = False
            try:
                sched = fetch_schedule_statsapi(start_d, end_d, gtype)
                dates = sched.get("dates", [])
                day_blocks = [{"date": d["date"], "games": d.get("games", [])} for d in dates]
            except Exception as e:
                print(f"[nhl]     StatsAPI schedule failed ({e}); falling back to api-web per day")
                use_apiweb = True
                # build per-day blocks
                day_blocks = []
                cur = start_d
                while cur <= end_d:
                    try:
                        j = fetch_schedule_apiweb_day(cur)
                        games = parse_apiweb_games(j)
                        day_blocks.append({"date": cur.isoformat(), "games": games})
                    except Exception as _:
                        pass
                    cur += timedelta(days=1)

            for d in day_blocks:
                date_iso = d["date"]
                for game in d.get("games", []):
                    if not use_apiweb:
                        game_pk = game["gamePk"]
                        status = safe_get(game,"status","detailedState", default="scheduled")
                        home_name = safe_get(game,"teams","home","team","name")
                        away_name = safe_get(game,"teams","away","team","name")
                        try:
                            box = fetch_boxscore_statsapi(game_pk)
                        except Exception as e:
                            print(f"[nhl]     WARN boxscore (statsapi) {game_pk}: {e}")
                            continue
                        box_parsed = box
                        htri = safe_get(box_parsed,"teams","home","team","triCode") or (home_name[:3].upper() if home_name else None)
                        atri = safe_get(box_parsed,"teams","away","team","triCode") or (away_name[:3].upper() if away_name else None)
                        home_id_ext = safe_get(box_parsed,"teams","home","team","id")
                        away_id_ext = safe_get(box_parsed,"teams","away","team","id")
                        home_score = safe_get(game,"linescore","teams","home","goals") or safe_get(game,"teams","home","score")
                        away_score = safe_get(game,"linescore","teams","away","goals") or safe_get(game,"teams","away","score")
                    else:
                        game_pk = game["gamePk"]
                        status = game["status"]
                        home_name = game["home"]["name"]
                        away_name = game["away"]["name"]
                        try:
                            box = fetch_boxscore_apiweb(game_pk)
                            box_parsed = parse_apiweb_boxscore(box)
                        except Exception as e:
                            print(f"[nhl]     WARN boxscore (api-web) {game_pk}: {e}")
                            continue
                        htri = game["home"].get("triCode") or (home_name[:3].upper() if home_name else None)
                        atri = game["away"].get("triCode") or (away_name[:3].upper() if away_name else None)
                        home_id_ext = game["home"].get("id")
                        away_id_ext = game["away"].get("id")
                        home_score = game["home"].get("score")
                        away_score = game["away"].get("score")

                    # upserts
                    home_tid = upsert_team(home_name, htri, home_id_ext)
                    away_tid = upsert_team(away_name, atri, away_id_ext)
                    game_id = upsert_game(game_pk, season_int, date_iso, home_name, away_name, home_score, away_score, status)
                    added_games += 1

                    # team stats
                    for side, tid, opp_score in [("home", home_tid, away_score), ("away", away_tid, home_score)]:
                        ts = safe_get(box_parsed, "teams", side, "teamStats", "teamSkaterStats", default={})
                        payload = {
                            "sport": SPORT, "game_id": game_id, "team_id": tid,
                            "goals_for": _to_int(ts.get("goals")), "goals_against": _to_int(opp_score),
                            "shots_for": _to_int(ts.get("shots")), "shots_against": None,
                            "pim": _to_int(ts.get("pim")), "hits_for": _to_int(ts.get("hits")),
                            "blocks": _to_int(ts.get("blocked")), "giveaways": _to_int(ts.get("giveaways")),
                            "takeaways": _to_int(ts.get("takeaways")),
                            "faceoff_win_pct": _to_float(ts.get("faceOffWinPercentage") or ts.get("foPct")),
                            "pp_goals": _to_int(ts.get("powerPlayGoals") or ts.get("ppGoals")),
                            "pp_opportunities": _to_int(ts.get("powerPlayOpportunities") or ts.get("ppOpps")),
                            "sh_goals": None,
                            "corsi_for": None, "corsi_against": None, "fenwick_for": None, "fenwick_against": None,
                            "xg_for": None, "xg_against": None
                        }
                        sb.table("team_game_stats").upsert(payload, on_conflict="sport,game_id,team_id").execute()

                    # players
                    for side, tid in [("home", home_tid), ("away", away_tid)]:
                        players = safe_get(box_parsed,"teams",side,"players", default={})
                        for key, p in players.items():
                            per = p.get("person", {}) or {}
                            full = per.get("fullName") or ""
                            first = (full.split(" ") or [""])[0]
                            last  = " ".join(full.split(" ")[1:]) if full else ""
                            pid_ext = per.get("id")
                            if pid_ext is None: 
                                continue
                            pid_db = upsert_player(pid_ext, full, first, last, tid)
                            if (p.get("position",{}) or {}).get("code") == "G":
                                gstats = safe_get(p,"stats","goalieStats", default={})
                                payload = {
                                    "sport": SPORT, "game_id": game_id, "team_id": tid, "player_id": pid_db,
                                    "goals": 0, "assists": 0, "points": 0, "shots": 0, "hits": 0, "blocks": 0,
                                    "pim": 0, "plus_minus": None, "toi": gstats.get("timeOnIce") or gstats.get("toi"),
                                    "goalie_sa": _to_int(gstats.get("shots") or gstats.get("shotsAgainst")),
                                    "goalie_sv": _to_int(gstats.get("saves")),
                                    "goalie_ga": _to_int(gstats.get("goalsAgainst")),
                                    "goalie_decision": gstats.get("decision"),
                                    "xg": None
                                }
                            else:
                                sk = safe_get(p,"stats","skaterStats", default={})
                                if not sk: 
                                    continue
                                payload = {
                                    "sport": SPORT, "game_id": game_id, "team_id": tid, "player_id": pid_db,
                                    "goals": _to_int(sk.get("goals")),
                                    "assists": _to_int(sk.get("assists")),
                                    "points": _to_int((_to_int(sk.get("goals")) or 0) + (_to_int(sk.get("assists")) or 0)),
                                    "shots": _to_int(sk.get("shots")),
                                    "hits": _to_int(sk.get("hits")),
                                    "blocks": _to_int(sk.get("blocked")),
                                    "pim": _to_int(sk.get("penaltyMinutes") or sk.get("pim")),
                                    "plus_minus": _to_int(sk.get("plusMinus")),
                                    "toi": sk.get("timeOnIce") or sk.get("toi"),
                                    "goalie_sa": None, "goalie_sv": None, "goalie_ga": None, "goalie_decision": None,
                                    "xg": None
                                }
                            sb.table("player_game_stats").upsert(payload, on_conflict="sport,game_id,player_id").execute()
                    time.sleep(0.1)
            time.sleep(0.1)
    return added_games

if __name__ == "__main__":
    try:
        before = sb.table("games").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    except Exception:
        before = 0
    print(f"[nhl] starting backfill. existing games: {before}")
    total_added = 0
    for s in SEASONS:
        print(f"[nhl] running season {s} ...")
        total_added += (run_season(s) or 0)
    try:
        after = sb.table("games").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    except Exception:
        after = before + total_added
    print(f"[nhl] backfill complete. new games added: {after - before}, total: {after}")
    if (after - before) <= 0:
        raise SystemExit("[nhl] ERROR: 0 games added. Check network or provider responses.")
