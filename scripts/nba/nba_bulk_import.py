#!/usr/bin/env python3
import os
import time
import math
from typing import Dict
import pandas as pd
from dateutil import parser as dtparser
from tenacity import retry, wait_fixed, stop_after_attempt
from supabase_client import get_client

from nba_api.stats.endpoints import leaguegamefinder, boxscoretraditionalv2, boxscoreadvancedv2
from nba_api.stats.static import teams as nba_teams
from nba_api.stats.endpoints import commonteamroster

SPORT = "NBA"
SEASONS = [s.strip() for s in os.getenv("NBA_YEARS", "2022-23,2023-24").split(",")]
SUMMER_TAG = os.getenv("NBA_SUMMER", "2025-sl")

sb = get_client()

team_cache: Dict[str, int] = {}
player_cache: Dict[str, int] = {}

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

def upsert_team(name: str, abbr: str, ext_id: str) -> int:
    if name in team_cache:
        return team_cache[name]
    res = sb.table("teams").upsert(
        {"sport": SPORT, "name": name, "abbr": abbr, "team_id_external": ext_id},
        on_conflict="sport,name"
    ).execute()
    tid = res.data[0]["id"]
    team_cache[name] = tid
    return tid

def upsert_player(player_ext_id: str, full_name: str, first: str, last: str, team_id: int) -> int:
    key = str(player_ext_id)
    if key in player_cache:
        return player_cache[key]
    res = sb.table("players").upsert(
        {"sport": SPORT, "player_id_external": key, "full_name": full_name, "first_name": first, "last_name": last, "primary_team_id": team_id},
        on_conflict="sport,player_id_external"
    ).execute()
    pid = res.data[0]["id"]
    player_cache[key] = pid
    return pid

def season_to_int(season_str: str) -> int:
    try:
        return int(season_str.split("-")[0])
    except Exception:
        return int(season_str)

def upsert_game(provider_game_id: str, season_str: str, game_date: str, home_team_name: str, away_team_name: str):
    payload = {
        "sport": SPORT,
        "provider_game_id": str(provider_game_id),
        "season": season_to_int(season_str),
        "week": 0,
        "game_date": game_date,
        "home_team": home_team_name,
        "away_team": away_team_name,
        "status": "final"
    }
    res = sb.table("games").upsert(payload, on_conflict="sport,provider_game_id").execute()
    return res.data[0]["id"]

def upsert_team_game_stats(game_id, team_id, row_basic: dict, row_adv: dict):
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

def upsert_player_game_stats(game_id, team_id, player_id, row: dict, adv_row: dict):
    payload = {
        "sport": SPORT,
        "game_id": game_id,
        "team_id": team_id,
        "player_id": player_id,
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

@retry(wait=wait_fixed(1), stop=stop_after_attempt(3))
def fetch_boxscore_traditional(game_id_ext: str):
    bs = boxscoretraditionalv2.BoxScoreTraditionalV2(game_id=game_id_ext)
    return bs.get_data_frames()[0], bs.get_data_frames()[1]

@retry(wait=wait_fixed(1), stop=stop_after_attempt(3))
def fetch_boxscore_advanced(game_id_ext: str):
    bs = boxscoreadvancedv2.BoxScoreAdvancedV2(game_id=game_id_ext)
    return bs.get_data_frames()[0], bs.get_data_frames()[1]

def get_all_games_for_season(season: str, season_type_label: str) -> pd.DataFrame:
    season_type_api = "Regular Season" if season_type_label == "regular" else "Playoffs"
    lgf = leaguegamefinder.LeagueGameFinder(season_nullable=season, season_type_nullable=season_type_api)
    return lgf.get_data_frames()[0]

def upsert_rosters_for_season(season: str):
    for t in nba_teams.get_teams():
        tid = upsert_team(t["full_name"], t["abbreviation"], str(t["id"]))
        try:
            roster = commonteamroster.CommonTeamRoster(season=season, team_id=t["id"]).get_data_frames()[0]
            for _, r in roster.iterrows():
                pid = str(int(r["PLAYER_ID"]))
                full = r["PLAYER"]
                parts = full.split(" ")
                first = parts[0]
                last = " ".join(parts[1:]) if len(parts) > 1 else ""
                upsert_player(pid, full, first, last, tid)
            time.sleep(0.4)
        except Exception:
            time.sleep(0.6)

def run_season(season: str, season_type_label: str):
    games_df = get_all_games_for_season(season, season_type_label)
    upsert_rosters_for_season(season)
    for _, g in games_df.iterrows():
        game_id_ext = g["GAME_ID"]
        try:
            df_players, df_teams = fetch_boxscore_traditional(game_id_ext)
            player_adv, team_adv = fetch_boxscore_advanced(game_id_ext)
        except Exception:
            time.sleep(0.6)
            continue

        team_rows = df_teams.to_dict(orient="records")
        if len(team_rows) != 2:
            continue
        team_id_to_name = {int(tr["TEAM_ID"]): tr["TEAM_NAME"] for tr in team_rows}
        team_adv_rows = {int(r["TEAM_ID"]): r for r in team_adv.to_dict(orient="records")}

        name_to_db = {}
        for tr in team_rows:
            tname = tr["TEAM_NAME"]
            tabbr = tr["TEAM_ABBREVIATION"]
            tid_ext = str(int(tr["TEAM_ID"]))
            tid = upsert_team(tname, tabbr, tid_ext)
            name_to_db[tname] = tid

        away_name = team_rows[0]["TEAM_NAME"]
        home_name = team_rows[1]["TEAM_NAME"]
        game_date = dtparser.parse(g["GAME_DATE"]).date().isoformat()

        game_db_id = upsert_game(
            provider_game_id=game_id_ext,
            season_str=season,
            game_date=game_date,
            home_team_name=home_name,
            away_team_name=away_name
        )

        for tr in team_rows:
            tname = tr["TEAM_NAME"]
            upsert_team_game_stats(
                game_db_id,
                name_to_db[tname],
                tr,
                team_adv_rows.get(int(tr["TEAM_ID"]))
            )

        player_adv_rows = {int(r["PLAYER_ID"]): r for r in player_adv.to_dict(orient="records")}
        for row in df_players.to_dict(orient="records"):
            pid_ext = int(row["PLAYER_ID"])
            full = row["PLAYER_NAME"]
            parts = full.split(" ")
            first = parts[0]
            last = " ".join(parts[1:]) if len(parts) > 1 else ""
            tid_ext = int(row["TEAM_ID"])
            team_name = team_id_to_name.get(tid_ext, "")
            if not team_name:
                continue
            player_id_db = upsert_player(str(pid_ext), full, first, last, name_to_db[team_name])
            upsert_player_game_stats(
                game_db_id,
                name_to_db[team_name],
                player_id_db,
                row,
                player_adv_rows.get(pid_ext)
            )
        time.sleep(0.6)

def run_summer_league():
    year = SUMMER_TAG.split("-")[0]
    for season_type_api in ["Pre Season", "Regular Season"]:
        try:
            lgf = leaguegamefinder.LeagueGameFinder(season_nullable=year, season_type_nullable=season_type_api)
            df = lgf.get_data_frames()[0]
            if df.empty:
                continue
            upsert_rosters_for_season(year)
            for _, g in df.iterrows():
                game_id_ext = g["GAME_ID"]
                try:
                    df_players, df_teams = fetch_boxscore_traditional(game_id_ext)
                    player_adv, team_adv = fetch_boxscore_advanced(game_id_ext)
                except Exception:
                    time.sleep(0.6)
                    continue

                team_rows = df_teams.to_dict(orient="records")
                if len(team_rows) != 2:
                    continue
                team_id_to_name = {int(tr["TEAM_ID"]): tr["TEAM_NAME"] for tr in team_rows}
                team_adv_rows = {int(r["TEAM_ID"]): r for r in team_adv.to_dict(orient="records")}

                name_to_db = {}
                for tr in team_rows:
                    tname = tr["TEAM_NAME"]
                    tabbr = tr["TEAM_ABBREVIATION"]
                    tid_ext = str(int(tr["TEAM_ID"]))
                    tid = upsert_team(tname, tabbr, tid_ext)
                    name_to_db[tname] = tid

                game_db_id = upsert_game(
                    provider_game_id=game_id_ext,
                    season_str=SUMMER_TAG,
                    game_date=dtparser.parse(g["GAME_DATE"]).date().isoformat(),
                    home_team_name=team_rows[1]["TEAM_NAME"],
                    away_team_name=team_rows[0]["TEAM_NAME"]
                )

                for tr in team_rows:
                    upsert_team_game_stats(
                        game_db_id,
                        name_to_db[tr["TEAM_NAME"]],
                        tr,
                        team_adv_rows.get(int(tr["TEAM_ID"]))
                    )

                player_adv_rows = {int(r["PLAYER_ID"]): r for r in player_adv.to_dict(orient="records")}
                for row in df_players.to_dict(orient="records"):
                    pid_ext = int(row["PLAYER_ID"])
                    full = row["PLAYER_NAME"]
                    parts = full.split(" ")
                    first = parts[0]
                    last = " ".join(parts[1:]) if len(parts) > 1 else ""
                    tid_ext = int(row["TEAM_ID"])
                    team_name = team_id_to_name.get(tid_ext, "")
                    if not team_name:
                        continue
                    player_id_db = upsert_player(str(pid_ext), full, first, last, name_to_db[team_name])
                    upsert_player_game_stats(
                        game_db_id,
                        name_to_db[team_name],
                        player_id_db,
                        row,
                        player_adv_rows.get(pid_ext)
                    )
                time.sleep(0.6)
            break
        except Exception:
            time.sleep(0.6)
            continue

if __name__ == "__main__":
    for t in nba_teams.get_teams():
        upsert_team(t["full_name"], t["abbreviation"], str(t["id"]))
    for s in SEASONS:
        run_season(s, "regular")
        run_season(s, "playoffs")
    run_summer_league()
    print("NBA bulk import complete.")
