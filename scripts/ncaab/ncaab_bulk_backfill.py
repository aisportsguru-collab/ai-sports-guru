#!/usr/bin/env python3
import os, sys, time, re, json
from typing import Dict, List, Optional
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
import requests
import pandas as pd

# Ensure repo root on path (so imports work in Actions and locally)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

try:
    from scripts.ncaab.supabase_client import get_client
except ModuleNotFoundError:
    # Fallback when executed directly from scripts/ncaab/
    sys.path.append(os.path.dirname(__file__))
    from supabase_client import get_client  # type: ignore

SPORT = "NCAAB"
# Seasons must be END YEARS on Sports-Reference (e.g., 2023, 2024)
SEASONS = [int(s.strip()) for s in os.getenv("NCAAB_SEASONS", "2023,2024").split(",") if s.strip()]

# ---------- HTTP session (with UA + retries) ----------
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
session = requests.Session()
session.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})

class HttpError(Exception): pass

@retry(wait=wait_exponential(multiplier=1, min=1, max=20),
       stop=stop_after_attempt(5),
       retry=retry_if_exception_type(HttpError))
def get_html(url: str) -> str:
    resp = session.get(url, timeout=30)
    if resp.status_code != 200 or not resp.text:
        raise HttpError(f"bad status {resp.status_code} for {url}")
    return resp.text

# ---------- Supabase ----------
sb = get_client()

def upsert_team(name: str, abbr: Optional[str], ext_id: Optional[str]) -> str:
    res = sb.table("teams").upsert(
        {
            "sport": SPORT,
            "name": name,
            "abbr": abbr or (name[:3].upper() if name else None),
            "team_id_external": ext_id
        },
        on_conflict="sport,name"
    ).execute()
    return res.data[0]["id"]

def upsert_player(ext_id: Optional[str], full: Optional[str], first: Optional[str], last: Optional[str], team_id: Optional[str]) -> str:
    res = sb.table("players").upsert(
        {
            "sport": SPORT,
            "player_id_external": ext_id,
            "full_name": full,
            "first_name": first,
            "last_name": last,
            "primary_team_id": team_id
        },
        on_conflict="sport,player_id_external"
    ).execute()
    return res.data[0]["id"]

def _num(x):
    try:
        if x in ("", None):
            return None
        # strip % and other non-numeric chars
        xs = str(x).replace(",", "").replace("%", "")
        return float(xs)
    except Exception:
        return None

def _slug_from_href(href: str) -> Optional[str]:
    # /cbb/schools/duke/2024.html -> duke
    if not href:
        return None
    m = re.search(r"/cbb/schools/([^/]+)/\d{4}\.html", href)
    return m.group(1) if m else None

# ---------- Parse team season table ----------
def fetch_team_season_rows(season: int) -> List[Dict]:
    # School stats (has per-game and totals table)
    url_basic = f"https://www.sports-reference.com/cbb/seasons/{season}-school-stats.html"
    # Advanced school stats (Pace, ORtg, eFG%, TOV%, ORB%, FT Rate, etc.)
    url_adv   = f"https://www.sports-reference.com/cbb/seasons/{season}-advanced-school-stats.html"

    try:
        html_basic = get_html(url_basic)
    except Exception as e:
        print(f"[ncaab] warn: failed to fetch {url_basic}: {e}")
        html_basic = ""

    try:
        html_adv = get_html(url_adv)
    except Exception as e:
        print(f"[ncaab] warn: failed to fetch {url_adv}: {e}")
        html_adv = ""

    # Parse with pandas.read_html (lxml)
    frames_basic = pd.read_html(html_basic) if html_basic else []
    frames_adv = pd.read_html(html_adv) if html_adv else []

    # Heuristic: choose the first table with a 'School' column
    def pick_school_table(frames):
        for df in frames:
            if "School" in df.columns or "School.1" in df.columns or "Team" in df.columns:
                return df
        return None

    df_basic = pick_school_table(frames_basic)
    df_adv = pick_school_table(frames_adv)

    if df_basic is None and df_adv is None:
        return []

    # Normalize columns
    if df_basic is not None:
        df_basic = df_basic.loc[~df_basic["School"].isin(["School"])].copy() if "School" in df_basic.columns else df_basic
        # Some pages include "Rk" and totals rows; drop obvious non-schools
        if "School" in df_basic.columns:
            df_basic = df_basic[df_basic["School"].astype(str).str.contains("School|Schools")==False]
    if df_adv is not None:
        if "School" in df_adv.columns:
            df_adv = df_adv[df_adv["School"].astype(str).str.contains("School|Schools")==False]

    # Merge on School when both present
    if df_basic is not None and df_adv is not None:
        df = pd.merge(df_basic, df_adv, on="School", how="outer", suffixes=("", "_adv"))
    else:
        df = df_basic if df_basic is not None else df_adv

    # Scrape hrefs to get team slug for ext id
    # Quick parse with regex over original HTML (basic page usually has links)
    slug_map: Dict[str, str] = {}
    for m in re.finditer(r'<a href="(/cbb/schools/[^"]+/\d{4}\.html)">(.*?)</a>', html_basic or ""):
        href, name = m.group(1), re.sub(r"\s+\(\d+\)$", "", m.group(2)).strip()
        slug = _slug_from_href(href)
        if slug:
            slug_map[name] = slug

    rows: List[Dict] = []
    if df is None or df.empty:
        return rows

    # Fill rows
    for _, r in df.iterrows():
        school = r.get("School") or r.get("Team")
        if not school or str(school).strip().lower() in ("school", "schools", "team", "teams", "nan"):
            continue
        name = str(school).strip()
        slug = slug_map.get(name)
        # try fallback: remove record in name " (28-7)"
        if not slug:
            cleaned = re.sub(r"\s+\(\d+-\d+\)$", "", name).strip()
            slug = slug_map.get(cleaned)

        payload = {
            "sport": SPORT,
            "season": season,
            "team_name": name,
            "team_id_external": slug or name.lower().replace(" ", "-"),
            # basic outcomes if present
            "games": _num(r.get("G")),
            "wins": _num(r.get("W")),
            "losses": _num(r.get("L")),
            # Advanced (if available)
            "pace": _num(r.get("Pace") or r.get("Pace_adv")),
            "ortg": _num(r.get("ORtg")),
            "drtg": _num(r.get("DRtg")),
            "srs": _num(r.get("SRS")),
            "efg_pct": _num(r.get("eFG%") or r.get("eFG%_adv")),
            "ts_pct": _num(r.get("TS%")),
            "ftr": _num(r.get("FTr") or r.get("FT/FGA") or r.get("FT Rate")),
            "threepa_rate": _num(r.get("3PAr") or r.get("3PA Rate")),
            "tov_pct": _num(r.get("TOV%") or r.get("TOV%_adv")),
            "orb_pct": _num(r.get("ORB%") or r.get("ORB%_adv")),
            "drb_pct": _num(r.get("DRB%") or r.get("DRB%_adv")),
            "stl_pct": _num(r.get("STL%") or r.get("STL%_adv")),
            "blk_pct": _num(r.get("BLK%") or r.get("BLK%_adv")),
            "opp_ppg": _num(r.get("Opp Pts/G") or r.get("Opp PPG")),
            "ppg": _num(r.get("Pts/G") or r.get("PPG")),
            "raw": None
        }
        rows.append(payload)

    return rows

# ---------- Parse player tables per-team ----------
def fetch_team_players(season: int, team_slug: str) -> List[Dict]:
    # Team season page
    url = f"https://www.sports-reference.com/cbb/schools/{team_slug}/{season}.html"
    try:
        html = get_html(url)
    except Exception:
        return []

    # Try to pull per-game and advanced player tables if present
    # We'll use read_html and pick tables containing "Player" column
    frames = pd.read_html(html)
    candidates = [df for df in frames if "Player" in df.columns]

    # try to find one with per-game points etc
    per_game = None
    advanced = None
    for df in candidates:
        cols = set(df.columns.astype(str))
        if {"Player", "G", "MP", "PTS"}.issubset(cols) or {"Player", "G", "MP", "PTS/G"}.issubset(cols):
            per_game = df.copy()
        if {"Player", "USG%", "ORtg"}.issubset(cols) or {"Player", "USG%", "ORTG"}.issubset(cols):
            advanced = df.copy()

    # Normalize
    out = []
    if per_game is None and advanced is None:
        return out

    def clean_player_name(x):
        # strip (CPT) or class info sometimes appended in anchors text
        return str(x).strip()

    # Merge on Player if both present
    if per_game is not None:
        per_game = per_game[per_game["Player"].astype(str).str.lower() != "player"].copy()
    if advanced is not None:
        advanced = advanced[advanced["Player"].astype(str).str.lower() != "player"].copy()

    if per_game is not None and advanced is not None:
        merged = pd.merge(per_game, advanced, on="Player", how="left", suffixes=("", "_adv"))
    else:
        merged = per_game if per_game is not None else advanced

    for _, r in merged.iterrows():
        pname = clean_player_name(r.get("Player"))
        if not pname or str(pname).lower() in ("player", "nan"):
            continue
        mpg = _num(r.get("MPG") or r.get("MP") or r.get("MP/G"))
        ppg = _num(r.get("PTS/G") or r.get("PTS") or r.get("PPG"))
        rpg = _num(r.get("TRB/G") or r.get("TRB"))
        apg = _num(r.get("AST/G") or r.get("AST"))
        spg = _num(r.get("STL/G") or r.get("STL"))
        bpg = _num(r.get("BLK/G") or r.get("BLK"))
        efg = _num(r.get("eFG%") or r.get("eFG%_adv"))
        tsp = _num(r.get("TS%"))
        usg = _num(r.get("USG%") or r.get("USG%_adv"))
        ortg = _num(r.get("ORtg") or r.get("ORTG"))
        drtg = _num(r.get("DRtg") or r.get("DRTG"))

        out.append({
            "sport": SPORT,
            "season": season,
            "player_name": pname,
            "mpg": mpg,
            "ppg": ppg,
            "rpg": rpg,
            "apg": apg,
            "spg": spg,
            "bpg": bpg,
            "efg_pct": efg,
            "ts_pct": tsp,
            "usg_pct": usg,
            "ortg": ortg,
            "drtg": drtg,
        })
    return out

def run_season(season: int):
    print(f"[ncaab] season {season}: fetch team list")
    team_rows = fetch_team_season_rows(season)
    if not team_rows:
        print(f"[ncaab] season {season}: no team rows found, skipping.")
        return

    added_t = added_p = 0
    for tr in team_rows:
        name = tr["team_name"]
        slug = tr.get("team_id_external")
        team_id = upsert_team(name, None, slug)

        # write team season stats
        trow = dict(tr)
        trow["team_id"] = team_id
        sb.table("ncaab_team_season_stats").upsert(trow, on_conflict="sport,season,team_id").execute()
        added_t += 1

        # fetch and write players
        players = fetch_team_players(season, slug) if slug else []
        for p in players:
            first = p["player_name"].split(" ")[0] if p.get("player_name") else None
            last = " ".join(p["player_name"].split(" ")[1:]) if p.get("player_name") else None
            pid = upsert_player(
                ext_id=(p.get("player_name") + f"-{season}-{slug}") if slug else p.get("player_name"),
                full=p.get("player_name"),
                first=first,
                last=last,
                team_id=team_id
            )
            prow = dict(p)
            prow["team_id"] = team_id
            prow["player_id"] = pid
            sb.table("ncaab_player_season_stats").upsert(prow, on_conflict="sport,season,player_id").execute()
            added_p += 1

        time.sleep(0.2)  # be polite to SR

    print(f"[ncaab] season {season} done. teams:{added_t} players:{added_p}")

if __name__ == "__main__":
    before_t = sb.table("ncaab_team_season_stats").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    before_p = sb.table("ncaab_player_season_stats").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    for s in SEASONS:
        run_season(s)
    after_t = sb.table("ncaab_team_season_stats").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    after_p = sb.table("ncaab_player_season_stats").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    print(f"[ncaab] backfill complete. +teams:{(after_t or 0)-(before_t or 0)} +players:{(after_p or 0)-(before_p or 0)}")
    if ((after_t or 0)-(before_t or 0)) <= 0 and ((after_p or 0)-(before_p or 0)) <= 0:
        raise SystemExit("[ncaab] ERROR: 0 rows added. Check site availability or selectors.")
