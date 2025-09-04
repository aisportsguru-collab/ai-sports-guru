#!/usr/bin/env python3
"""
NHL bulk backfill for last two seasons (or seasons via NHL_SEASONS).
Order of data sources (with automatic fallbacks):
  1) statsapi.web.nhl.com  (monthly schedule windows)
  2) api-web.nhle.com      (daily scoreboard)
  3) api-web.nhle.com      (club-schedule-season across all 32 teams)
Robust HTTP (Session, UA, exponential retry), progress logs, and a safety check
that errors if 0 games are added.
"""

import os, time, requests
from datetime import date, timedelta
from calendar import monthrange
from tenacity import retry, wait_exponential, stop_after_attempt
from supabase_client import get_client

SPORT = "NHL"
SEASONS = [s.strip() for s in os.getenv("NHL_SEASONS", "20222023,20232024").split(",") if s.strip()]
sb = get_client()

# --------------- HTTP helpers ---------------
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (compatible; AiSportsGuru/1.0)"})

@retry(wait=wait_exponential(multiplier=1, min=1, max=10), stop=stop_after_attempt(6))
def http_json(url: str):
    r = SESSION.get(url, timeout=30)
    r.raise_for_status()
    return r.json()

def safe_get(d, *keys, default=None):
    for k in keys:
        if not isinstance(d, dict) or k not in d:
            return default
        d = d[k]
    return d

# --------------- type helpers ---------------
def _to_int(x):
    if x is None: return None
    try: return int(float(str(x)))
    except: return None

def _to_float(x):
    if x is None: return None
    try: return float(x)
    except: return None

# --------------- DB helpers ---------------
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

# --------------- schedule windows ---------------
def season_month_ranges(season_str: str):
    y1 = int(season_str[:4]); y2 = int(season_str[4:])
    months = []
    for m in [10,11,12]:
        months.append((date(y1,m,1), date(y1,m,monthrange(y1,m)[1])))
    for m in [1,2,3,4,5,6,7]:
        months.append((date(y2,m,1), date(y2,m,monthrange(y2,m)[1])))
    return months

# --------------- providers ---------------
def fetch_schedule_statsapi(start_d: date, end_d: date, gtype: str):
    url = f"https://statsapi.web.nhl.com/api/v1/schedule?startDate={start_d.isoformat()}&endDate={end_d.isoformat()}&gameType={gtype}"
    return http_json(url)

def fetch_schedule_apiweb_day(day: date):
    url = f"https://api-web.nhle.com/v1/scoreboard/{day.isoformat()}"
    return http_json(url)

def fetch_club_schedule_apiweb(team: str, season: str):
    # team is triCode, e.g., 'BOS', 'NYR', 'SEA'
    url = f"https://api-web.nhle.com/v1/club-schedule-season/{team}/{season}"
    return http_json(url)

def fetch_boxscore_statsapi(game_pk: str):
    url = f"https://statsapi.web.nhl.com/api/v1/game/{game_pk}/boxscore"
    return http_json(url)

def fetch_boxscore_apiweb(game_id: str):
    url = f"https://api-web.nhle.com/v1/gamecenter/{game_id}/boxscore"
    return http_json(url)

# --------------- parse helpers ---------------
def parse_apiweb_games_from_scoreboard(day_json):
    games = []
    for g in day_json.get("games", []):
        gid = g.get("id")
        if not gid: continue
        home = g.get("homeTeam") or {}
        away = g.get("awayTeam") or {}
        games.append({
            "gamePk": str(gid),
            "date": g.get("gameDate") or g.get("gameDateUTC"),
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
        for sk in (t.get("skaters") or []):
            pid = sk.get("playerId");  name = sk.get("name")
            if not pid: continue
            key = f"ID{pid}"
            out["teams"][side]["players"][key] = {
                "person": {"id": pid, "fullName": name},
                "position": {"code": sk.get("positionCode","")},
                "stats": {"skaterStats": {
                    "goals": sk.get("goals"), "assists": sk.get("assists"),
                    "shots": sk.get("shots"), "hits": sk.get("hits"),
                    "blocked": sk.get("blocked"), "penaltyMinutes": sk.get("pim"),
                    "plusMinus": sk.get("plusMinus"), "timeOnIce": sk.get("toi"),
                }}
            }
        for gk in (t.get("goalies") or []):
            pid = gk.get("playerId"); name = gk.get("name")
            if not pid: continue
            key = f"ID{pid}"
            out["teams"][side]["players"][key] = {
                "person": {"id": pid, "fullName": name},
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

# list of 32 NHL team tricodes for club-schedule-season
NHL_TEAMS = [
    "ANA","ARI","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL",
    "NSH","NJD","NYI","NYR","OTT","PHI","PIT","SEA","SJS","STL","TBL","TOR","VAN","VGK","WPG","WSH"
]

# --------------- main runner ---------------
def run_season(season_str: str):
    season_int = int(season_str[:4])
    added_games = 0
    seen_game_ids = set()

    # -------- attempt 1: StatsAPI monthly windows --------
    for gtype in ("R","P"):
        label = "Regular" if gtype=="R" else "Playoffs"
        print(f"[nhl]  -> {season_str} [{label}] via StatsAPI windows")
        for (start_d, end_d) in season_month_ranges(season_str):
            print(f"[nhl]     window {start_d}..{end_d}")
            try:
                sched = fetch_schedule_statsapi(start_d, end_d, gtype)
                dates = sched.get("dates", [])
                for d in dates:
                    date_iso = d["date"]
                    for g in d.get("games", []):
                        game_pk = g["gamePk"]
                        if game_pk in seen_game_ids: 
                            continue
                        try:
                            box = fetch_boxscore_statsapi(game_pk)
                        except Exception as e:
                            print(f"[nhl]     WARN statsapi boxscore {game_pk}: {e}")
                            continue

                        home_name = safe_get(g,"teams","home","team","name")
                        away_name = safe_get(g,"teams","away","team","name")
                        htri = safe_get(box,"teams","home","team","triCode") or (home_name[:3].upper() if home_name else None)
                        atri = safe_get(box,"teams","away","team","triCode") or (away_name[:3].upper() if away_name else None)
                        home_id_ext = safe_get(box,"teams","home","team","id")
                        away_id_ext = safe_get(box,"teams","away","team","id")
                        status = safe_get(g,"status","detailedState","scheduled")
                        home_score = safe_get(g,"linescore","teams","home","goals") or safe_get(g,"teams","home","score")
                        away_score = safe_get(g,"linescore","teams","away","goals") or safe_get(g,"teams","away","score")

                        home_tid = upsert_team(home_name, htri, home_id_ext)
                        away_tid = upsert_team(away_name, atri, away_id_ext)
                        game_db_id = upsert_game(game_pk, season_int, date_iso, home_name, away_name, home_score, away_score, status)
                        seen_game_ids.add(game_pk); added_games += 1

                        for side, tid, opp_score in [("home", home_tid, away_score), ("away", away_tid, home_score)]:
                            ts = safe_get(box,"teams",side,"teamStats","teamSkaterStats", default={})
                            sb.table("team_game_stats").upsert({
                                "sport": SPORT, "game_id": game_db_id, "team_id": tid,
                                "goals_for": _to_int(ts.get("goals")), "goals_against": _to_int(opp_score),
                                "shots_for": _to_int(ts.get("shots")), "shots_against": None,
                                "pim": _to_int(ts.get("pim")), "hits_for": _to_int(ts.get("hits")),
                                "blocks": _to_int(ts.get("blocked")), "giveaways": _to_int(ts.get("giveaways")),
                                "takeaways": _to_int(ts.get("takeaways")),
                                "faceoff_win_pct": _to_float(ts.get("faceOffWinPercentage")),
                                "pp_goals": _to_int(ts.get("powerPlayGoals")), "pp_opportunities": _to_int(ts.get("powerPlayOpportunities")),
                                "sh_goals": None, "corsi_for": None, "corsi_against": None, "fenwick_for": None, "fenwick_against": None,
                                "xg_for": None, "xg_against": None
                            }, on_conflict="sport,game_id,team_id").execute()

                        for side, tid in [("home", home_tid), ("away", away_tid)]:
                            players = safe_get(box,"teams",side,"players", default={})
                            for _, p in players.items():
                                per = p.get("person",{}) or {}
                                full = per.get("fullName") or ""
                                first = (full.split(" ") or [""])[0]
                                last  = " ".join(full.split(" ")[1:]) if full else ""
                                pid_ext = per.get("id")
                                if pid_ext is None: continue
                                pid_db = upsert_player(pid_ext, full, first, last, tid)
                                if (p.get("position",{}) or {}).get("code") == "G":
                                    gstats = safe_get(p,"stats","goalieStats", default={})
                                    payload = {
                                        "sport": SPORT, "game_id": game_db_id, "team_id": tid, "player_id": pid_db,
                                        "goals": 0, "assists": 0, "points": 0, "shots": 0, "hits": 0, "blocks": 0,
                                        "pim": 0, "plus_minus": None, "toi": gstats.get("timeOnIce"),
                                        "goalie_sa": _to_int(gstats.get("shots")), "goalie_sv": _to_int(gstats.get("saves")),
                                        "goalie_ga": _to_int(gstats.get("goalsAgainst")), "goalie_decision": gstats.get("decision"),
                                        "xg": None
                                    }
                                else:
                                    sk = safe_get(p,"stats","skaterStats", default={})
                                    if not sk: continue
                                    payload = {
                                        "sport": SPORT, "game_id": game_db_id, "team_id": tid, "player_id": pid_db,
                                        "goals": _to_int(sk.get("goals")), "assists": _to_int(sk.get("assists")),
                                        "points": _to_int((_to_int(sk.get("goals")) or 0)+(_to_int(sk.get("assists")) or 0)),
                                        "shots": _to_int(sk.get("shots")), "hits": _to_int(sk.get("hits")),
                                        "blocks": _to_int(sk.get("blocked")), "pim": _to_int(sk.get("penaltyMinutes")),
                                        "plus_minus": _to_int(sk.get("plusMinus")), "toi": sk.get("timeOnIce"),
                                        "goalie_sa": None, "goalie_sv": None, "goalie_ga": None, "goalie_decision": None, "xg": None
                                    }
                                sb.table("player_game_stats").upsert(payload, on_conflict="sport,game_id,player_id").execute()
                        time.sleep(0.08)
                time.sleep(0.06)
            except Exception as e:
                print(f"[nhl]     StatsAPI schedule failed ({e}); falling back later")

    # If we already inserted games, return.
    if added_games > 0:
        return added_games

    # -------- attempt 2: api-web day scoreboard --------
    print(f"[nhl]  -> {season_str} day scoreboard fallback (api-web)")
    for (start_d, end_d) in season_month_ranges(season_str):
        cur = start_d
        while cur <= end_d:
            try:
                day_json = fetch_schedule_apiweb_day(cur)
            except Exception as e:
                cur += timedelta(days=1); continue
            games = parse_apiweb_games_from_scoreboard(day_json)
            for g in games:
                game_pk = g["gamePk"]
                if game_pk in seen_game_ids: 
                    continue
                try:
                    box = fetch_boxscore_apiweb(game_pk)
                    box_parsed = parse_apiweb_boxscore(box)
                except Exception:
                    continue

                home_name = g["home"]["name"]; away_name = g["away"]["name"]
                htri = g["home"]["triCode"] or (home_name[:3].upper() if home_name else None)
                atri = g["away"]["triCode"] or (away_name[:3].upper() if away_name else None)
                home_id_ext = g["home"]["id"]; away_id_ext = g["away"]["id"]
                status = g["status"]; date_iso = (g["date"] or cur.isoformat())[:10]
                home_score = g["home"].get("score"); away_score = g["away"].get("score")

                home_tid = upsert_team(home_name, htri, home_id_ext)
                away_tid = upsert_team(away_name, atri, away_id_ext)
                game_db_id = upsert_game(game_pk, int(season_str[:4]), date_iso, home_name, away_name, home_score, away_score, status)
                seen_game_ids.add(game_pk); added_games += 1

                for side, tid, opp_score in [("home", home_tid, away_score), ("away", away_tid, home_score)]:
                    ts = safe_get(box_parsed,"teams",side,"teamStats","teamSkaterStats", default={})
                    sb.table("team_game_stats").upsert({
                        "sport": SPORT, "game_id": game_db_id, "team_id": tid,
                        "goals_for": _to_int(ts.get("goals")), "goals_against": _to_int(opp_score),
                        "shots_for": _to_int(ts.get("shots")), "shots_against": None,
                        "pim": _to_int(ts.get("pim")), "hits_for": _to_int(ts.get("hits")),
                        "blocks": _to_int(ts.get("blocked")), "giveaways": _to_int(ts.get("giveaways")),
                        "takeaways": _to_int(ts.get("takeaways")),
                        "faceoff_win_pct": _to_float(ts.get("faceOffWinPercentage") or ts.get("foPct")),
                        "pp_goals": _to_int(ts.get("powerPlayGoals") or ts.get("ppGoals")),
                        "pp_opportunities": _to_int(ts.get("powerPlayOpportunities") or ts.get("ppOpps")),
                        "sh_goals": None, "corsi_for": None, "corsi_against": None, "fenwick_for": None, "fenwick_against": None,
                        "xg_for": None, "xg_against": None
                    }, on_conflict="sport,game_id,team_id").execute()

                for side, tid in [("home", home_tid), ("away", away_tid)]:
                    players = safe_get(box_parsed,"teams",side,"players", default={})
                    for _, p in players.items():
                        per = p.get("person",{}) or {}
                        full = per.get("fullName") or ""
                        first = (full.split(" ") or [""])[0]
                        last  = " ".join(full.split(" ")[1:]) if full else ""
                        pid_ext = per.get("id")
                        if pid_ext is None: continue
                        pid_db = upsert_player(pid_ext, full, first, last, tid)
                        if (p.get("position",{}) or {}).get("code") == "G":
                            gstats = safe_get(p,"stats","goalieStats", default={})
                            payload = {
                                "sport": SPORT, "game_id": game_db_id, "team_id": tid, "player_id": pid_db,
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
                            if not sk: continue
                            payload = {
                                "sport": SPORT, "game_id": game_db_id, "team_id": tid, "player_id": pid_db,
                                "goals": _to_int(sk.get("goals")), "assists": _to_int(sk.get("assists")),
                                "points": _to_int((_to_int(sk.get("goals")) or 0)+(_to_int(sk.get("assists")) or 0)),
                                "shots": _to_int(sk.get("shots")), "hits": _to_int(sk.get("hits")),
                                "blocks": _to_int(sk.get("blocked")),
                                "pim": _to_int(sk.get("penaltyMinutes") or sk.get("pim")),
                                "plus_minus": _to_int(sk.get("plusMinus")),
                                "toi": sk.get("timeOnIce") or sk.get("toi"),
                                "goalie_sa": None, "goalie_sv": None, "goalie_ga": None, "goalie_decision": None,
                                "xg": None
                            }
                        sb.table("player_game_stats").upsert(payload, on_conflict="sport,game_id,player_id").execute()
                time.sleep(0.06)
            cur += timedelta(days=1)

    if added_games > 0:
        return added_games

    # -------- attempt 3: per-team season schedules (api-web) --------
    print(f"[nhl]  -> {season_str} team-schedule fallback (api-web)")
    for team in NHL_TEAMS:
        try:
            sch = fetch_club_schedule_apiweb(team, season_str)
        except Exception as e:
            print(f"[nhl]     WARN club schedule {team}: {e}")
            continue
        for g in sch.get("games", []):
            game_pk = str(g.get("id"))
            if not game_pk or game_pk in seen_game_ids:
                continue
            # date + who is home/away are in schedule; names/ids come from boxscore
            date_iso = (g.get("gameDate") or g.get("gameDateUTC") or "")[:10]
            try:
                box = fetch_boxscore_apiweb(game_pk)
                box_parsed = parse_apiweb_boxscore(box)
            except Exception as e:
                print(f"[nhl]     WARN gamecenter boxscore {game_pk}: {e}")
                continue

            # derive team names/ids from boxscore
            home_name = safe_get(box,"home","team","commonName","default") or safe_get(box,"home","team","name") or "Home"
            away_name = safe_get(box,"away","team","commonName","default") or safe_get(box,"away","team","name") or "Away"
            htri = safe_get(box,"home","team","abbrev") or home_name[:3].upper()
            atri = safe_get(box,"away","team","abbrev") or away_name[:3].upper()
            home_id_ext = safe_get(box,"home","team","id")
            away_id_ext = safe_get(box,"away","team","id")
            # scores if present
            home_score = safe_get(box,"home","score"); away_score = safe_get(box,"away","score")
            status = safe_get(box,"gameState","state") or "final"

            home_tid = upsert_team(home_name, htri, home_id_ext)
            away_tid = upsert_team(away_name, atri, away_id_ext)
            game_db_id = upsert_game(game_pk, season_int, date_iso or sch.get("seasonStart") or f"{season_int}-10-01",
                                     home_name, away_name, home_score, away_score, status)
            seen_game_ids.add(game_pk); added_games += 1

            for side, tid, opp_score in [("home", home_tid, away_score), ("away", away_tid, home_score)]:
                ts = safe_get(parse_apiweb_boxscore(box),"teams",side,"teamStats","teamSkaterStats", default={})
                sb.table("team_game_stats").upsert({
                    "sport": SPORT, "game_id": game_db_id, "team_id": tid,
                    "goals_for": _to_int(ts.get("goals")), "goals_against": _to_int(opp_score),
                    "shots_for": _to_int(ts.get("shots")), "shots_against": None,
                    "pim": _to_int(ts.get("pim")), "hits_for": _to_int(ts.get("hits")),
                    "blocks": _to_int(ts.get("blocks") or ts.get("blocked")),
                    "giveaways": _to_int(ts.get("giveaways")), "takeaways": _to_int(ts.get("takeaways")),
                    "faceoff_win_pct": _to_float(ts.get("foPct") or ts.get("faceOffWinPercentage")),
                    "pp_goals": _to_int(ts.get("ppGoals") or ts.get("powerPlayGoals")),
                    "pp_opportunities": _to_int(ts.get("ppOpps") or ts.get("powerPlayOpportunities")),
                    "sh_goals": None, "corsi_for": None, "corsi_against": None, "fenwick_for": None, "fenwick_against": None,
                    "xg_for": None, "xg_against": None
                }, on_conflict="sport,game_id,team_id").execute()

            # players from parsed boxscore
            parsed = parse_apiweb_boxscore(box)
            for side, tid in [("home", home_tid), ("away", away_tid)]:
                players = safe_get(parsed,"teams",side,"players", default={})
                for _, p in players.items():
                    per = p.get("person",{}) or {}
                    full = per.get("fullName") or ""
                    first = (full.split(" ") or [""])[0]
                    last  = " ".join(full.split(" ")[1:]) if full else ""
                    pid_ext = per.get("id")
                    if pid_ext is None: continue
                    pid_db = upsert_player(pid_ext, full, first, last, tid)
                    if (p.get("position",{}) or {}).get("code") == "G":
                        gstats = safe_get(p,"stats","goalieStats", default={})
                        payload = {
                            "sport": SPORT, "game_id": game_db_id, "team_id": tid, "player_id": pid_db,
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
                        if not sk: continue
                        payload = {
                            "sport": SPORT, "game_id": game_db_id, "team_id": tid, "player_id": pid_db,
                            "goals": _to_int(sk.get("goals")), "assists": _to_int(sk.get("assists")),
                            "points": _to_int((_to_int(sk.get("goals")) or 0)+(_to_int(sk.get("assists")) or 0)),
                            "shots": _to_int(sk.get("shots")), "hits": _to_int(sk.get("hits")),
                            "blocks": _to_int(sk.get("blocked") or sk.get("blocks")),
                            "pim": _to_int(sk.get("penaltyMinutes") or sk.get("pim")),
                            "plus_minus": _to_int(sk.get("plusMinus")), "toi": sk.get("timeOnIce") or sk.get("toi"),
                            "goalie_sa": None, "goalie_sv": None, "goalie_ga": None, "goalie_decision": None, "xg": None
                        }
                    sb.table("player_game_stats").upsert(payload, on_conflict="sport,game_id,player_id").execute()
            time.sleep(0.06)

    return added_games

# --------------- entrypoint ---------------
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
        raise SystemExit("[nhl] ERROR: 0 games added. Check network/provider responses.")
