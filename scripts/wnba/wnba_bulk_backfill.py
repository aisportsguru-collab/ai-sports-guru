import os
import re
import sys
import time
import json
import math
import traceback
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple

# Ensure repo root on path for imports when run in GitHub Actions
if os.getenv("PYTHONPATH") is None or os.getcwd() not in (os.getenv("PYTHONPATH") or ""):
    sys.path.insert(0, os.getcwd())

import pandas as pd
import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from scripts.wnba.supabase_client import get_client, ensure_team, ensure_player, upsert_rows

SPORT = "WNBA"
PROVIDER = "basketball-reference"
BASE = "https://www.basketball-reference.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/"
}

@retry(reraise=True, stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, min=1, max=20),
       retry=retry_if_exception_type((requests.RequestException,)))
def http_get(url: str) -> requests.Response:
    resp = requests.get(url, headers=HEADERS, timeout=20)
    if resp.status_code >= 400:
        raise requests.RequestException(f"Status {resp.status_code} for {url}")
    return resp

def http_get_with_proxy(url: str) -> str:
    try:
        return http_get(url).text
    except Exception:
        pass
    # Proxy fallback through r.jina.ai
    try:
        # Use http inside the proxy to avoid cert issues
        inner = url.replace("https://", "http://")
        prox = f"https://r.jina.ai/{inner}"
        r = http_get(prox)
        return r.text
    except Exception as e:
        raise RuntimeError(f"Failed to fetch {url} with proxy: {e}")

def current_wnba_season_year(today: Optional[date] = None) -> int:
    d = today or date.today()
    # WNBA typically starts around May and ends in fall
    return d.year if d.month >= 4 else d.year - 1

def season_list() -> List[int]:
    cur = current_wnba_season_year()
    return [cur - 2, cur - 1, cur]

def parse_schedule_month_urls(season: int) -> List[str]:
    url = f"{BASE}/wnba/years/{season}_games.html"
    html = http_get_with_proxy(url)
    soup = BeautifulSoup(html, "html.parser")
    links = []
    for a in soup.select("div.filter a"):
        href = a.get("href", "")
        if href.startswith("/wnba/years/") and "_games-" in href:
            links.append(BASE + href)
    # Include the season summary page itself, which also has a schedule table
    links = [url] + links
    # De dup while preserving order
    seen = set()
    out = []
    for l in links:
        if l not in seen:
            seen.add(l)
            out.append(l)
    return out

def parse_schedule_rows(page_html: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(page_html, "html.parser")
    table = soup.find("table", id="schedule")
    games = []
    if not table:
        return games
    for tr in table.tbody.find_all("tr"):
        if "class" in tr.attrs and "thead" in tr.get("class", []):
            continue
        # Skip rows without result
        date_td = tr.find("th", {"data-stat": "date_game"})
        if not date_td:
            continue
        # Some rows are separators
        if date_td.get_text(strip=True) in ("", "Playoffs"):
            continue
        game_date_str = date_td.get("csk") or date_td.get_text(strip=True)
        try:
            game_date = datetime.strptime(game_date_str, "%Y-%m-%d").date()
        except Exception:
            try:
                game_date = datetime.strptime(game_date_str, "%a, %b %d, %Y").date()
            except Exception:
                continue
        visitor = tr.find("td", {"data-stat": "visitor_team_name"})
        home = tr.find("td", {"data-stat": "home_team_name"})
        if not visitor or not home:
            continue
        away_team = visitor.get_text(strip=True)
        home_team = home.get_text(strip=True)
        # Box score link if exists
        box_td = tr.find("td", {"data-stat": "box_score_text"})
        provider_game_id = None
        boxscore_url = None
        if box_td and box_td.find("a"):
            href = box_td.find("a").get("href", "")
            boxscore_url = BASE + href
            # slug like /wnba/boxscores/202507010SEA.html
            m = re.search(r"/boxscores/([^\.]+)\.html", href)
            if m:
                provider_game_id = m.group(1)
        else:
            # fallback to generated id
            provider_game_id = f"{game_date.isoformat()}_{away_team.replace(' ','')}_at_{home_team.replace(' ','')}"
        games.append({
            "date": game_date.isoformat(),
            "away_team": away_team,
            "home_team": home_team,
            "boxscore_url": boxscore_url,
            "provider_game_id": provider_game_id
        })
    return games

def mmss_to_minutes(s: str) -> float:
    if not s or s == "0:00":
        return 0.0
    try:
        parts = s.split(":")
        return int(parts[0]) + int(parts[1]) / 60.0
    except Exception:
        return 0.0

def safe_float(x) -> Optional[float]:
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    t = str(x).strip().replace(",", "").replace("%", "")
    if t == "" or t.lower() in ("nan", "none"):
        return None
    try:
        return float(t)
    except Exception:
        return None

def compute_team_adv(team: Dict[str, Any], opp: Dict[str, Any]) -> Dict[str, Any]:
    # Basic counts
    pts = safe_float(team.get("PTS")) or 0.0
    fga = safe_float(team.get("FGA")) or 0.0
    fgm = safe_float(team.get("FG")) or 0.0
    fg3a = safe_float(team.get("3PA")) or 0.0
    fg3m = safe_float(team.get("3P")) or 0.0
    fta = safe_float(team.get("FTA")) or 0.0
    tov = safe_float(team.get("TOV")) or 0.0
    orb = safe_float(team.get("ORB")) or 0.0
    drb_opp = safe_float(opp.get("DRB")) or 0.0
    pts_opp = safe_float(opp.get("PTS")) or 0.0
    fga_opp = safe_float(opp.get("FGA")) or 0.0
    fgm_opp = safe_float(opp.get("FG")) or 0.0
    fg3m_team = fg3m

    # Possessions estimate
    team_part = fga + 0.4 * fta - 1.07 * ((orb / (orb + drb_opp)) if (orb + drb_opp) > 0 else 0.0) * (fga - fgm) + tov
    # Opponent part
    orb_opp = safe_float(opp.get("ORB")) or 0.0
    drb_team = safe_float(team.get("DRB")) or 0.0
    fta_opp = safe_float(opp.get("FTA")) or 0.0
    tov_opp = safe_float(opp.get("TOV")) or 0.0
    team_drb_part = 1.07 * ((orb_opp / (orb_opp + drb_team)) if (orb_opp + drb_team) > 0 else 0.0) * (fga_opp - fgm_opp)
    opp_part = fga_opp + 0.4 * fta_opp - team_drb_part + tov_opp
    poss = 0.5 * (team_part + opp_part)
    poss = max(poss, 1.0)

    off_rtg = 100.0 * pts / poss
    def_rtg = 100.0 * pts_opp / poss
    net_rtg = off_rtg - def_rtg
    efg = ((fgm + 0.5 * fg3m_team) / fga) if fga > 0 else None
    ts = (pts / (2 * (fga + 0.44 * fta))) if (fga + 0.44 * fta) > 0 else None

    return {
        "offensive_rating": off_rtg,
        "defensive_rating": def_rtg,
        "net_rating": net_rtg,
        "efg_pct": efg,
        "ts_pct": ts
    }

def parse_box_score(url: str) -> Dict[str, Any]:
    html = http_get_with_proxy(url)
    soup = BeautifulSoup(html, "html.parser")

    # Team names appear in strong tags near the scoreboard, but we rely on table captions
    # Player basic tables have ids like box-TEAM-game-basic and include a tfoot with team totals
    team_tables = [t for t in soup.find_all("table") if t.get("id", "").startswith("box-") and t.get("id", "").endswith("-game-basic")]

    teams = []
    players = []
    team_totals = {}

    for tbl in team_tables:
        team_id = tbl.get("id").split("-")[1]  # e.g. SEA, PHO
        # header contains team name
        caption = tbl.find("caption")
        team_name = caption.get_text(strip=True) if caption else team_id
        # rows
        tbody = tbl.find("tbody")
        for tr in tbody.find_all("tr"):
            if "class" in tr.attrs and "thead" in tr.get("class", []):
                continue
            th = tr.find("th", {"data-stat": "player"})
            if not th:
                continue
            p_name = th.get_text(strip=True)
            if p_name in ("Reserves", "Team Totals"):
                continue
            tds = {td.get("data-stat"): td.get_text(strip=True) for td in tr.find_all("td")}
            row = {
                "team_name": team_name,
                "player_name": p_name,
                "mp": tds.get("mp", "0:00"),
                "pts": tds.get("pts"),
                "trb": tds.get("trb"),
                "ast": tds.get("ast"),
                "stl": tds.get("stl"),
                "blk": tds.get("blk"),
                "tov": tds.get("tov"),
                "pf": tds.get("pf"),
                "fg": tds.get("fg"),
                "fga": tds.get("fga"),
                "fg3": tds.get("fg3"),
                "fg3a": tds.get("fg3a"),
                "ft": tds.get("ft"),
                "fta": tds.get("fta"),
                "plus_minus": tds.get("plus_minus")
            }
            players.append(row)
        # team totals from tfoot
        tfoot = tbl.find("tfoot")
        if tfoot:
            tds = {td.get("data-stat"): td.get_text(strip=True) for td in tfoot.find_all("td")}
            team_totals[team_name] = {
                "FG": tds.get("fg"),
                "FGA": tds.get("fga"),
                "3P": tds.get("fg3"),
                "3PA": tds.get("fg3a"),
                "FT": tds.get("ft"),
                "FTA": tds.get("fta"),
                "ORB": tds.get("orb"),
                "DRB": tds.get("drb"),
                "TRB": tds.get("trb"),
                "AST": tds.get("ast"),
                "STL": tds.get("stl"),
                "BLK": tds.get("blk"),
                "TOV": tds.get("tov"),
                "PF": tds.get("pf"),
                "PTS": tds.get("pts"),
            }
            if team_name not in teams:
                teams.append(team_name)

    return {"players": players, "team_totals": team_totals, "teams": teams}

def upsert_game_and_stats(client, season: int, g: Dict[str, Any]) -> Tuple[int, int]:
    # Ensure teams
    home_team_id = ensure_team(client, SPORT, g["home_team"])
    away_team_id = ensure_team(client, SPORT, g["away_team"])
    # Upsert game
    game_row = {
        "sport": SPORT,
        "provider": PROVIDER,
        "provider_game_id": g["provider_game_id"],
        "season": season,
        "game_date": g["date"],
    }
    upsert_rows(client, "games", [game_row], on_conflict="sport,provider_game_id")
    # Fetch back game id
    try:
        gx = client.table("games").select("id").match({"sport": SPORT, "provider_game_id": g["provider_game_id"]}).limit(1).execute()
        if not gx.data:
            return 0, 0
        game_id = gx.data[0]["id"]
    except Exception as e:
        print(f"WARN could not fetch game id for {g['provider_game_id']}: {e}")
        return 0, 0

    team_stats_rows = []
    player_stats_rows = []

    if g.get("boxscore_url"):
        try:
            parsed = parse_box_score(g["boxscore_url"])
            team_names = parsed["teams"]
            team_totals = parsed["team_totals"]
            players = parsed["players"]
            if len(team_names) == 2:
                tA, tB = team_names[0], team_names[1]
                advA = compute_team_adv(team_totals.get(tA, {}), team_totals.get(tB, {}))
                advB = compute_team_adv(team_totals.get(tB, {}), team_totals.get(tA, {}))
                map_tid = {}
                for tnm in team_names:
                    tid = ensure_team(client, SPORT, tnm)
                    if tid:
                        map_tid[tnm] = tid
                # Team rows
                for tnm, adv in zip([tA, tB], [advA, advB]):
                    tt = team_totals.get(tnm, {})
                    team_stats_rows.append({
                        "sport": SPORT,
                        "game_id": game_id,
                        "team_id": map_tid.get(tnm),
                        "points": safe_float(tt.get("PTS")),
                        "assists": safe_float(tt.get("AST")),
                        "rebounds": safe_float(tt.get("TRB")),
                        "steals": safe_float(tt.get("STL")),
                        "blocks": safe_float(tt.get("BLK")),
                        "turnovers": safe_float(tt.get("TOV")),
                        "fgm": safe_float(tt.get("FG")),
                        "fga": safe_float(tt.get("FGA")),
                        "fg3m": safe_float(tt.get("3P")),
                        "fg3a": safe_float(tt.get("3PA")),
                        "ftm": safe_float(tt.get("FT")),
                        "fta": safe_float(tt.get("FTA")),
                        "offensive_rebounds": safe_float(tt.get("ORB")),
                        "defensive_rebounds": safe_float(tt.get("DRB")),
                        "offensive_rating": adv.get("offensive_rating"),
                        "defensive_rating": adv.get("defensive_rating"),
                        "net_rating": adv.get("net_rating"),
                        "efg_pct": adv.get("efg_pct"),
                        "ts_pct": adv.get("ts_pct"),
                    })
            # Player rows
            for p in players:
                tid = ensure_team(client, SPORT, p["team_name"])
                pid = ensure_player(client, SPORT, p["player_name"], tid)
                player_stats_rows.append({
                    "sport": SPORT,
                    "game_id": game_id,
                    "team_id": tid,
                    "player_id": pid,
                    "minutes": mmss_to_minutes(p.get("mp", "0:00")),
                    "points": safe_float(p.get("pts")),
                    "rebounds": safe_float(p.get("trb")),
                    "assists": safe_float(p.get("ast")),
                    "steals": safe_float(p.get("stl")),
                    "blocks": safe_float(p.get("blk")),
                    "turnovers": safe_float(p.get("tov")),
                    "fouls": safe_float(p.get("pf")),
                    "fgm": safe_float(p.get("fg")),
                    "fga": safe_float(p.get("fga")),
                    "fg3m": safe_float(p.get("fg3")),
                    "fg3a": safe_float(p.get("fg3a")),
                    "ftm": safe_float(p.get("ft")),
                    "fta": safe_float(p.get("fta")),
                    "plus_minus": safe_float(p.get("plus_minus")),
                    # Advanced shot quality helpers
                    "efg_pct": None,  # compute only if desired at player level
                    "ts_pct": None
                })
        except Exception as e:
            print(f"WARN parsing box score {g.get('boxscore_url')}: {e}")

    # Upserts
    t_ok, _ = upsert_rows(client, "team_game_stats", team_stats_rows, on_conflict="sport,game_id,team_id")
    p_ok, _ = upsert_rows(client, "player_game_stats", player_stats_rows, on_conflict="sport,game_id,player_id")
    return t_ok, p_ok

def run():
    print(f"Starting WNBA bulk backfill at {datetime.utcnow().isoformat()}Z")
    client = get_client()
    seasons = season_list()
    total_games = 0
    total_team_rows = 0
    total_player_rows = 0

    for season in seasons:
        try:
            month_urls = parse_schedule_month_urls(season)
        except Exception as e:
            print(f"WARN could not load schedule list for {season}: {e}")
            continue
        season_games = []
        for murl in month_urls:
            try:
                html = http_get_with_proxy(murl)
                gs = parse_schedule_rows(html)
                season_games.extend(gs)
                time.sleep(0.5)
            except Exception as e:
                print(f"WARN schedule page {murl} failed: {e}")
        print(f"Season {season} schedule rows: {len(season_games)}")
        if not season_games:
            print(f"WARN season {season} produced zero games. Off season or blocked source. Continuing.")
            continue

        # Upsert games first, then details by box scores
        for g in season_games:
            try:
                t_ok, p_ok = upsert_game_and_stats(client, season, g)
                total_games += 1
                total_team_rows += t_ok
                total_player_rows += p_ok
            except Exception as e:
                print(f"WARN upsert failed for game {g.get('provider_game_id')}: {e}")

    print(f"Completed WNBA bulk backfill. seasons={seasons} games_seen={total_games} team_rows={total_team_rows} player_rows={total_player_rows}")
    print("Success. Exiting 0.")

if __name__ == "__main__":
    run()
