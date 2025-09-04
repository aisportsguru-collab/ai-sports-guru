#!/usr/bin/env python3
"""
NHL bulk backfill for last two seasons (or seasons provided via NHL_SEASONS).
- Robust HTTP: requests.Session + real User-Agent + exponential retry
- Pulls schedule month-by-month (Oct..Jul) for Regular + Playoffs
- Upserts into: games, team_game_stats, player_game_stats
- Prints progress and fails the run if 0 games were added
"""

import os
import time
import requests
from datetime import date
from calendar import monthrange
from tenacity import retry, wait_exponential, stop_after_attempt
from supabase_client import get_client

SPORT = "NHL"
# Default seasons in NHL format "YYYYYYYY" (e.g., 20222023). Comma-separated.
SEASONS = [s.strip() for s in os.getenv("NHL_SEASONS", "20222023,20232024").split(",") if s.strip()]

sb = get_client()

# ------------------------------ HTTP helpers ------------------------------

SESSION = requests.Session()
SESSION.headers.update({
    # Some CDNs reject default UA strings from runners
    "User-Agent": "Mozilla/5.0 (compatible; AiSportsGuru/1.0; +https://example.com)"
})

@retry(wait=wait_exponential(multiplier=1, min=1, max=10), stop=stop_after_attempt(6))
def nhl_json(url: str):
    r = SESSION.get(url, timeout=30)
    r.raise_for_status()
    return r.json()

# ------------------------------ type helpers ------------------------------

def _to_int(x):
    if x is None: return None
    try:
        return int(float(str(x)))
    except Exception:
        return None

def _to_float(x):
    if x is None: return None
    try:
        return float(x)
    except Exception:
        return None

# ------------------------------ DB helpers ------------------------------

def upsert_team(name, abbr, ext_id):
    res = sb.table("teams").upsert(
        {"sport": SPORT, "name": name, "abbr": abbr, "team_id_external": str(ext_id)},
        on_conflict="sport,name"
    ).execute()
    return res.data[0]["id"]

def upsert_player(pid_ext, full, first, last, team_id):
    res = sb.table("players").upsert(
        {
            "sport": SPORT,
            "player_id_external": str(pid_ext),
            "full_name": full,
            "first_name": first,
            "last_name": last,
            "primary_team_id": team_id,
        },
        on_conflict="sport,player_id_external",
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
        on_conflict="sport,provider_game_id",
    ).execute()
    return res.data[0]["id"]

# ------------------------------ schedule windowing ------------------------------

def season_month_ranges(season_str: str):
    """
    NHL season like '20222023':
      - Oct..Dec of Y1, Jan..Jul of Y2 (Jul buffer for Cup finals end)
    """
    y1 = int(season_str[:4])
    y2 = int(season_str[4:])
    months = []
    for m in [10, 11, 12]:
        months.append((date(y1, m, 1), date(y1, m, monthrange(y1, m)[1])))
    for m in [1, 2, 3, 4, 5, 6, 7]:
        months.append((date(y2, m, 1), date(y2, m, monthrange(y2, m)[1])))
    return months

def fetch_month_schedule(start_d: date, end_d: date, gtype: str):
    url = f"https://statsapi.web.nhl.com/api/v1/schedule?startDate={start_d.isoformat()}&endDate={end_d.isoformat()}&gameType={gtype}"
    return nhl_json(url)

# ------------------------------ main season runner ------------------------------

def run_season(season_str: str):
    season_int = int(season_str[:4])
    added_games = 0

    for gtype in ("R", "P"):  # Regular + Playoffs
        label = "Regular" if gtype == "R" else "Playoffs"
        print(f"[nhl]  -> {season_str} [{label}]")
        for (start_d, end_d) in season_month_ranges(season_str):
            print(f"[nhl]     fetching schedule {start_d}..{end_d} ({label})")
            try:
                sched = fetch_month_schedule(start_d, end_d, gtype)
            except Exception as e:
                print(f"[nhl]     WARN schedule fetch failed {start_d}..{end_d} gtype={gtype}: {e}")
                continue

            dates = sched.get("dates", [])
            for d in dates:
                date_iso = d["date"]
                for game in d.get("games", []):
                    game_pk = game["gamePk"]
                    status = game.get("status", {}).get("detailedState", "scheduled")
                    teams = game.get("teams", {})
                    home = teams.get("home", {}).get("team", {})
                    away = teams.get("away", {}).get("team", {})
                    home_name = home.get("name")
                    away_name = away.get("name")
                    if not home_name or not away_name:
                        continue

                    # boxscore (with retry)
                    try:
                        box = nhl_json(f"https://statsapi.web.nhl.com/api/v1/game/{game_pk}/boxscore")
                    except Exception as e:
                        print(f"[nhl]     WARN boxscore failed game {game_pk}: {e}")
                        time.sleep(0.3)
                        continue

                    home_abbr = box["teams"]["home"]["team"].get("triCode") or home_name[:3].upper()
                    away_abbr = box["teams"]["away"]["team"].get("triCode") or away_name[:3].upper()
                    home_tid = upsert_team(home_name, home_abbr, box["teams"]["home"]["team"]["id"])
                    away_tid = upsert_team(away_name, away_abbr, box["teams"]["away"]["team"]["id"])

                    # final/linescore scores if present, else team score field from schedule
                    linescore = game.get("linescore", {})
                    home_score = (
                        linescore.get("teams", {}).get("home", {}).get("goals")
                        or teams.get("home", {}).get("score")
                    )
                    away_score = (
                        linescore.get("teams", {}).get("away", {}).get("goals")
                        or teams.get("away", {}).get("score")
                    )

                    game_id = upsert_game(
                        game_pk, season_int, date_iso, home_name, away_name, home_score, away_score, status
                    )
                    added_games += 1

                    # TEAM STATS
                    for side, tid, opp_score in [("home", home_tid, away_score), ("away", away_tid, home_score)]:
                        ts = box["teams"][side]["teamStats"]["teamSkaterStats"]
                        payload = {
                            "sport": SPORT,
                            "game_id": game_id,
                            "team_id": tid,
                            "goals_for": _to_int(ts.get("goals")),
                            "goals_against": _to_int(opp_score),
                            "shots_for": _to_int(ts.get("shots")),
                            "shots_against": None,  # NHL endpoint doesn't give this directly here
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

                    # PLAYERS
                    for side, tid in [("home", home_tid), ("away", away_tid)]:
                        players = box["teams"][side]["players"]
                        for pid_key in players:
                            p = players[pid_key]
                            per = p.get("person", {})
                            full = per.get("fullName", "") or ""
                            parts = full.split(" ")
                            first = parts[0] if parts else ""
                            last = " ".join(parts[1:]) if len(parts) > 1 else ""
                            pid_ext = per.get("id")
                            if pid_ext is None:
                                continue

                            player_id_db = upsert_player(pid_ext, full, first, last, tid)

                            if p.get("position", {}).get("code") == "G":
                                gstats = p.get("stats", {}).get("goalieStats", {}) or {}
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
                                sk = p.get("stats", {}).get("skaterStats") or {}
                                if not sk:
                                    continue
                                payload = {
                                    "sport": SPORT, "game_id": game_id, "team_id": tid, "player_id": player_id_db,
                                    "goals": _to_int(sk.get("goals")),
                                    "assists": _to_int(sk.get("assists")),
                                    "points": _to_int((_to_int(sk.get("goals")) or 0) + (_to_int(sk.get("assists")) or 0)),
                                    "shots": _to_int(sk.get("shots")),
                                    "hits": _to_int(sk.get("hits")),
                                    "blocks": _to_int(sk.get("blocked")),
                                    "pim": _to_int(sk.get("penaltyMinutes")),
                                    "plus_minus": _to_int(sk.get("plusMinus")),
                                    "toi": sk.get("timeOnIce"),
                                    "goalie_sa": None, "goalie_sv": None, "goalie_ga": None, "goalie_decision": None,
                                    "xg": None
                                }
                            sb.table("player_game_stats").upsert(payload, on_conflict="sport,game_id,player_id").execute()

                    # Pacing to be friendly to the API
                    time.sleep(0.12)
            time.sleep(0.12)
    return added_games

# ------------------------------ entrypoint ------------------------------

if __name__ == "__main__":
    # Count before
    try:
        before_games = sb.table("games").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    except Exception:
        before_games = 0
    print(f"[nhl] starting backfill. existing games: {before_games}")

    total_added = 0
    for s in SEASONS:
        print(f"[nhl] running season {s} ...")
        added = run_season(s)
        total_added += (added or 0)
        print(f"[nhl] season {s} added games: {added}")

    # Count after
    try:
        after_games = sb.table("games").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    except Exception:
        after_games = before_games + total_added

    print(f"[nhl] backfill complete. new games added: {after_games - before_games}, total: {after_games}")

    if (after_games - before_games) <= 0:
        raise SystemExit("[nhl] ERROR: 0 games added. Check network/API reachability or season codes.")
