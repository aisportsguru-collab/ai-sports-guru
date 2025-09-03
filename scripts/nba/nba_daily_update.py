#!/usr/bin/env python3
import math
import time
from datetime import datetime, timedelta
from dateutil import tz
from supabase_client import get_client
from nba_api.stats.endpoints import scoreboardv2, boxscoretraditionalv2, boxscoreadvancedv2

SPORT = "NBA"
sb = get_client()

def _none_if_nan(x):
    if x is None:
        return None
    if isinstance(x, float) and math.isnan(x):
        return None
    if isinstance(x, str) and x.strip() == "":
        return None
    return x

def _to_int(x):
    x = _none_if_nan(x)
    if x is None:
        return None
    if isinstance(x, (int,)):
        return int(x)
    try:
        return int(float(str(x)))
    except Exception:
        return None

def _to_float(x):
    x = _none_if_nan(x)
    if x is None:
        return None
    try:
        return float(x)
    except Exception:
        return None

def game_exists(provider_game_id: str) -> bool:
    res = sb.table("games").select("id").eq("sport", SPORT).eq("provider_game_id", provider_game_id).limit(1).execute()
    return bool(res.data)

def upsert_game(provider_game_id: str, game_date: str, home_team_name: str, away_team_name: str, season_guess_int: int):
    payload = {
        "sport": SPORT,
        "provider_game_id": str(provider_game_id),
        "season": season_guess_int,
        "week": 0,
        "game_date": game_date,
        "home_team": home_team_name,
        "away_team": away_team_name,
        "status": "final"
    }
    res = sb.table("games").upsert(payload, on_conflict="sport,provider_game_id").execute()
    return res.data[0]["id"]

def get_team_id_by_name(name: str):
    r = sb.table("teams").select("id").eq("sport", SPORT).eq("name", name).limit(1).execute()
    return r.data[0]["id"] if r.data else None

def get_or_create_player(player_ext_id, full, first, last, team_id):
    r = sb.table("players").select("id").eq("sport", SPORT).eq("player_id_external", str(player_ext_id)).limit(1).execute()
    if r.data:
        return r.data[0]["id"]
    res = sb.table("players").upsert({
        "sport": SPORT,
        "player_id_external": str(player_ext_id),
        "full_name": full,
        "first_name": first,
        "last_name": last,
        "primary_team_id": team_id
    }, on_conflict="sport,player_id_external").execute()
    return res.data[0]["id"]

def upsert_team_stats(game_id, team_id, row_basic, row_adv):
    payload = {
        "sport": SPORT,
        "game_id": game_id,
        "team_id": team_id,
        "pts": _to_int(row_basic.get("PTS")),
        "fgm": _to_int(row_basic.get("FGM")),
        "fga": _to_int(row_basic.get("FGA")),
        "fg3m": _to_int(row_basic.get("FG3M")),
        "fg3a": _to_int(row_basic.get("FG3A")),
        "ftm": _to_int(row_basic.get("FTM")),
        "fta": _to_int(row_basic.get("FTA")),
        "oreb": _to_int(row_basic.get("OREB")),
        "dreb": _to_int(row_basic.get("DREB")),
        "reb": _to_int(row_basic.get("REB")),
        "ast": _to_int(row_basic.get("AST")),
        "stl": _to_int(row_basic.get("STL")),
        "blk": _to_int(row_basic.get("BLK")),
        "tov": _to_int(row_basic.get("TOV")),
        "pf": _to_int(row_basic.get("PF")),
        "plus_minus": _to_int(row_basic.get("PLUS_MINUS")),
        "off_rating": _to_float(row_adv.get("OFF_RATING")) if row_adv else None,
        "def_rating": _to_float(row_adv.get("DEF_RATING")) if row_adv else None,
        "pace": _to_float(row_adv.get("PACE")) if row_adv else None,
        "efg_pct": _to_float(row_adv.get("EFG_PCT")) if row_adv else None,
        "oreb_pct": _to_float(row_adv.get("OREB_PCT")) if row_adv else None,
        "dreb_pct": _to_float(row_adv.get("DREB_PCT")) if row_adv else None,
        "reb_pct": _to_float(row_adv.get("REB_PCT")) if row_adv else None
    }
    sb.table("team_game_stats").upsert(payload, on_conflict="sport,game_id,team_id").execute()

def upsert_player_stats(game_id, team_id, player_id_db, row, adv_row):
    payload = {
        "sport": SPORT,
        "game_id": game_id,
        "team_id": team_id,
        "player_id": player_id_db,
        "minutes": row.get("MIN"),
        "pts": _to_int(row.get("PTS")),
        "fgm": _to_int(row.get("FGM")),
        "fga": _to_int(row.get("FGA")),
        "fg3m": _to_int(row.get("FG3M")),
        "fg3a": _to_int(row.get("FG3A")),
        "ftm": _to_int(row.get("FTM")),
        "fta": _to_int(row.get("FTA")),
        "oreb": _to_int(row.get("OREB")),
        "dreb": _to_int(row.get("DREB")),
        "reb": _to_int(row.get("REB")),
        "ast": _to_int(row.get("AST")),
        "stl": _to_int(row.get("STL")),
        "blk": _to_int(row.get("BLK")),
        "tov": _to_int(row.get("TOV")),
        "pf": _to_int(row.get("PF")),
        "plus_minus": _to_int(row.get("PLUS_MINUS")),
        "usg_pct": _to_float(adv_row.get("USG_PCT")) if adv_row else None,
        "ts_pct": _to_float(adv_row.get("TS_PCT")) if adv_row else None
    }
    sb.table("player_game_stats").upsert(payload, on_conflict="sport,game_id,player_id").execute()

def run():
    tz_la = tz.gettz("America/Los_Angeles")
    today = datetime.now(tz_la).date()
    start = today - timedelta(days=2)
    for d in range(0, 2):
        day = start + timedelta(days=d)
        try:
            sbv2 = scoreboardv2.ScoreboardV2(game_date=day.strftime("%m/%d/%Y"))
            header = sbv2.game_header.get_data_frame()
            if header.empty:
                continue

            line = sbv2.line_score.get_data_frame()
            id_to_name = {}
            for _, lr in line.iterrows():
                nm = f"{lr['TEAM_CITY_NAME']} {lr['TEAM_NICKNAME']}".strip()
                id_to_name[int(lr["TEAM_ID"])] = nm
                if not get_team_id_by_name(nm):
                    from nba_api.stats.static import teams as nba_teams
                    t = next((t for t in nba_teams.get_teams() if t["full_name"] == nm), None)
                    tabbr = t["abbreviation"] if t else lr.get("TEAM_ABBREVIATION","")
                    ext = str(t["id"]) if t else ""
                    sb.table("teams").upsert({"sport": SPORT, "name": nm, "abbr": tabbr, "team_id_external": ext}, on_conflict="sport,name").execute()

            for _, gh in header.iterrows():
                gid = gh["GAME_ID"]
                if game_exists(gid):
                    continue

                home_name = id_to_name.get(int(gh["HOME_TEAM_ID"]))
                away_name = id_to_name.get(int(gh["VISITOR_TEAM_ID"]))
                if not home_name or not away_name:
                    continue

                season_int = day.year
                game_id = upsert_game(str(gid), str(day), home_name, away_name, season_int)

                bs = boxscoretraditionalv2.BoxScoreTraditionalV2(game_id=gid)
                df_players = bs.get_data_frames()[0]
                df_teams = bs.get_data_frames()[1]

                adv = boxscoreadvancedv2.BoxScoreAdvancedV2(game_id=gid)
                player_adv = adv.get_data_frames()[0]
                team_adv = adv.get_data_frames()[1]

                team_adv_rows = {int(r["TEAM_ID"]): r for _, r in team_adv.iterrows()}
                player_adv_rows = {int(r["PLAYER_ID"]): r for _, r in player_adv.iterrows()}

                for _, tr in df_teams.iterrows():
                    tname = id_to_name.get(int(tr["TEAM_ID"]))
                    tid = get_team_id_by_name(tname)
                    upsert_team_stats(game_id, tid, tr.to_dict(), team_adv_rows.get(int(tr["TEAM_ID"])))

                for _, pr in df_players.iterrows():
                    full = pr["PLAYER_NAME"]
                    parts = full.split(" ")
                    first = parts[0]
                    last = " ".join(parts[1:]) if len(parts) > 1 else ""
                    tname = id_to_name.get(int(pr["TEAM_ID"]))
                    tid = get_team_id_by_name(tname)
                    pdb = get_or_create_player(int(pr["PLAYER_ID"]), full, first, last, tid)
                    upsert_player_stats(game_id, tid, pdb, pr.to_dict(), player_adv_rows.get(int(pr["PLAYER_ID"])))

                time.sleep(0.5)
        except Exception:
            time.sleep(0.6)
            continue

if __name__ == "__main__":
    run()
    print("NBA daily update complete.")
