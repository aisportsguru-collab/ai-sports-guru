#!/usr/bin/env python3
import os, sys, time, re
from typing import Dict, List, Optional
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
import requests
import pandas as pd

# Ensure repo root on path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

try:
    from scripts.ncaab.supabase_client import get_client
except ModuleNotFoundError:
    sys.path.append(os.path.dirname(__file__))
    from supabase_client import get_client  # type: ignore

SPORT = "NCAAB"
# Sports-Reference uses season END YEARS (e.g., 2023, 2024)
SEASONS = [int(s.strip()) for s in os.getenv("NCAAB_SEASONS", "2023,2024").split(",") if s.strip()]

# ---------- HTTP session (with UA + retries + proxy fallback) ----------
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
session = requests.Session()
session.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})

class HttpError(Exception): pass

def _proxy_url(url: str) -> str:
    # r.jina.ai fetch proxy (works well in CI). Use http scheme behind proxy.
    return url.replace("https://", "https://r.jina.ai/http://")

@retry(wait=wait_exponential(multiplier=1, min=1, max=20),
       stop=stop_after_attempt(5),
       retry=retry_if_exception_type(HttpError))
def get_html(url: str) -> str:
    # try direct
    try:
        r = session.get(url, timeout=30)
        if r.status_code == 200 and r.text:
            return r.text
    except Exception:
        pass
    # fallback via proxy
    purl = _proxy_url(url)
    r2 = session.get(purl, timeout=30)
    if r2.status_code != 200 or not r2.text:
        raise HttpError(f"bad status {r2.status_code} for {url} (via proxy)")
    return r2.text

# ---------- Supabase ----------
sb = get_client()

def upsert_team(name: str, abbr: Optional[str], ext_id: Optional[str]) -> str:
    res = sb.table("teams").upsert(
        {"sport": SPORT, "name": name, "abbr": abbr or (name[:3].upper() if name else None), "team_id_external": ext_id},
        on_conflict="sport,name"
    ).execute()
    return res.data[0]["id"]

def upsert_player(ext_id: Optional[str], full: Optional[str], first: Optional[str], last: Optional[str], team_id: Optional[str]) -> str:
    res = sb.table("players").upsert(
        {"sport": SPORT, "player_id_external": ext_id, "full_name": full, "first_name": first, "last_name": last, "primary_team_id": team_id},
        on_conflict="sport,player_id_external"
    ).execute()
    return res.data[0]["id"]

def _num(x):
    try:
        if x in ("", None): return None
        return float(str(x).replace(",", "").replace("%", ""))
    except Exception:
        return None

def _slug_from_href(href: str) -> Optional[str]:
    m = re.search(r"/cbb/schools/([^/]+)/\d{4}\.html", href or "")
    return m.group(1) if m else None

# ---------- Parse team season table ----------
def fetch_team_season_rows(season: int) -> List[Dict]:
    url_basic = f"https://www.sports-reference.com/cbb/seasons/{season}-school-stats.html"
    url_adv   = f"https://www.sports-reference.com/cbb/seasons/{season}-advanced-school-stats.html"

    try:
        html_basic = get_html(url_basic)
    except Exception as e:
        print(f"[ncaab] warn: fetch basic failed {season}: {e}")
        html_basic = ""

    try:
        html_adv = get_html(url_adv)
    except Exception as e:
        print(f"[ncaab] warn: fetch adv failed {season}: {e}")
        html_adv = ""

    frames_basic = pd.read_html(html_basic) if html_basic else []
    frames_adv   = pd.read_html(html_adv) if html_adv else []
    print(f"[ncaab] season {season}: tables basic={len(frames_basic)} adv={len(frames_adv)}")

    def pick_school_table(frames):
        for df in frames:
            cols = set(map(str, df.columns))
            if "School" in cols or "Team" in cols:
                return df
        return None

    df_basic = pick_school_table(frames_basic)
    df_adv   = pick_school_table(frames_adv)

    if df_basic is None and df_adv is None:
        return []

    # scrub header rows
    def clean_df(df):
        if df is None: return None
        if "School" in df.columns:
            df = df[df["School"].astype(str).str.lower().ne("school")]
        if "Team" in df.columns:
            df = df[df["Team"].astype(str).str.lower().ne("team")]
        return df

    df_basic = clean_df(df_basic)
    df_adv   = clean_df(df_adv)

    if df_basic is not None and df_adv is not None:
        key = "School" if "School" in df_basic.columns else "Team"
        df = pd.merge(df_basic, df_adv, on=key, how="outer", suffixes=("", "_adv"))
    else:
        df = df_basic if df_basic is not None else df_adv

    # Slugs from anchors on basic html
    slug_map: Dict[str, str] = {}
    for m in re.finditer(r'<a href="(/cbb/schools/[^"]+/\d{4}\.html)">(.*?)</a>', html_basic or ""):
        href, name = m.group(1), m.group(2)
        name = re.sub(r"\s+\(\d+-\d+\)$", "", name).strip()
        slug = _slug_from_href(href)
        if slug: slug_map[name] = slug

    rows: List[Dict] = []
    if df is None or df.empty:
        return rows

    key = "School" if "School" in df.columns else ("Team" if "Team" in df.columns else None)
    if key is None:
        return rows

    for _, r in df.iterrows():
        name = str(r.get(key, "")).strip()
        if not name or name.lower() in ("school", "team", "nan"):
            continue
        slug = slug_map.get(name) or name.lower().replace(" ", "-")
        rows.append({
            "sport": SPORT,
            "season": season,
            "team_name": name,
            "team_id_external": slug,
            "games": _num(r.get("G")),
            "wins": _num(r.get("W")),
            "losses": _num(r.get("L")),
            "pace": _num(r.get("Pace") or r.get("Pace_adv")),
            "ortg": _num(r.get("ORtg")),
            "drtg": _num(r.get("DRtg")),
            "srs": _num(r.get("SRS")),
            "efg_pct": _num(r.get("eFG%") or r.get("eFG%_adv")),
            "ts_pct": _num(r.get("TS%")),
            "ftr": _num(r.get("FTr") or r.get("FT Rate") or r.get("FT/FGA")),
            "threepa_rate": _num(r.get("3PAr") or r.get("3PA Rate")),
            "tov_pct": _num(r.get("TOV%") or r.get("TOV%_adv")),
            "orb_pct": _num(r.get("ORB%") or r.get("ORB%_adv")),
            "drb_pct": _num(r.get("DRB%") or r.get("DRB%_adv")),
            "stl_pct": _num(r.get("STL%") or r.get("STL%_adv")),
            "blk_pct": _num(r.get("BLK%") or r.get("BLK%_adv")),
            "opp_ppg": _num(r.get("Opp Pts/G") or r.get("Opp PPG")),
            "ppg": _num(r.get("Pts/G") or r.get("PPG")),
            "raw": None
        })
    return rows

# ---------- Player scraping ----------
def fetch_team_players(season: int, team_slug: str) -> List[Dict]:
    url = f"https://www.sports-reference.com/cbb/schools/{team_slug}/{season}.html"
    try:
        html = get_html(url)
    except Exception as e:
        print(f"[ncaab] warn: players fetch failed {team_slug} {season}: {e}")
        return []

    frames = pd.read_html(html)
    cand = [df for df in frames if "Player" in df.columns]
    per_game = None
    adv = None
    for df in cand:
        cols = set(map(str, df.columns))
        if {"Player","G","MP"}.issubset(cols) and ("PTS" in cols or "PTS/G" in cols): per_game = df.copy()
        if {"Player","USG%"}.issubset(cols) and ("ORtg" in cols or "ORTG" in cols): adv = df.copy()

    if per_game is None and adv is None:
        return []

    if per_game is not None:
        per_game = per_game[per_game["Player"].astype(str).str.lower() != "player"]
    if adv is not None:
        adv = adv[adv["Player"].astype(str).str.lower() != "player"]

    merged = pd.merge(per_game, adv, on="Player", how="left", suffixes=("", "_adv")) if (per_game is not None and adv is not None) else (per_game if per_game is not None else adv)

    out = []
    for _, r in merged.iterrows():
        pname = str(r.get("Player") or "").strip()
        if not pname or pname.lower()=="player":
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
            "sport": SPORT, "season": season, "player_name": pname,
            "mpg": mpg, "ppg": ppg, "rpg": rpg, "apg": apg, "spg": spg, "bpg": bpg,
            "efg_pct": efg, "ts_pct": tsp, "usg_pct": usg, "ortg": ortg, "drtg": drtg
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
        name = tr["team_name"]; slug = tr.get("team_id_external")
        team_id = upsert_team(name, None, slug)
        row = dict(tr); row["team_id"] = team_id
        sb.table("ncaab_team_season_stats").upsert(row, on_conflict="sport,season,team_id").execute()
        added_t += 1
        players = fetch_team_players(season, slug) if slug else []
        for p in players:
            first = p["player_name"].split(" ")[0] if p.get("player_name") else None
            last = " ".join(p["player_name"].split(" ")[1:]) if p.get("player_name") else None
            pid = upsert_player(
                ext_id=(p.get("player_name") + f"-{season}-{slug}") if slug else p.get("player_name"),
                full=p.get("player_name"), first=first, last=last, team_id=team_id
            )
            prow = dict(p); prow["team_id"] = team_id; prow["player_id"] = pid
            sb.table("ncaab_player_season_stats").upsert(prow, on_conflict="sport,season,player_id").execute()
            added_p += 1
        time.sleep(0.2)
    print(f"[ncaab] season {season} done. teams:{added_t} players:{added_p}")

if __name__ == "__main__":
    sb.table("ncaab_team_season_stats").select("id", count="exact").eq("sport", SPORT).execute()  # warm connection
    before_t = sb.table("ncaab_team_season_stats").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    before_p = sb.table("ncaab_player_season_stats").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    for s in SEASONS:
        run_season(s)
    after_t = sb.table("ncaab_team_season_stats").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    after_p = sb.table("ncaab_player_season_stats").select("id", count="exact").eq("sport", SPORT).execute().count or 0
    print(f"[ncaab] backfill complete. +teams:{(after_t or 0)-(before_t or 0)} +players:{(after_p or 0)-(before_p or 0)}")
    # Do not fail CI on zero; log only (site may block CI occasionally)
    if ((after_t or 0)-(before_t or 0)) <= 0 and ((after_p or 0)-(before_p or 0)) <= 0:
        print("[ncaab] WARN: 0 rows added. Check site availability or selectors.")
