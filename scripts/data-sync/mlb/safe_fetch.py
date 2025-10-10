import time, random, requests
import pandas as pd
from typing import Any
from pybaseball import batting_stats, batting_stats_bref

UA_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Referer": "https://www.fangraphs.com/",
    "Accept-Language": "en-US,en;q=0.9",
}

def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    if "Tm" in df.columns and "Team" not in df.columns:
        df = df.rename(columns={"Tm": "Team"})
    if "Player" in df.columns and "Name" not in df.columns:
        df = df.rename(columns={"Player": "Name"})
    # Drop obvious non-data rank column if present
    for c in ("#","Rk","Rank"):
        if c in df.columns:
            df = df.drop(columns=[c])
    return df

def _fetch_fg_direct(season: int) -> pd.DataFrame:
    # Mirror the “Standard Batting” leaders table
    url = "https://www.fangraphs.com/leaders-legacy.aspx"
    params = {
        "pos": "all",
        "stats": "bat",
        "lg": "all",
        "qual": "0",
        "type": "8",          # Standard batting
        "season": str(season),
        "month": "0",
        "season1": str(season),
        "ind": "0",
        "team": "",
    }
    r = requests.get(url, params=params, headers=UA_HEADERS, timeout=30)
    r.raise_for_status()
    tables = pd.read_html(r.text)
    if not tables:
        raise RuntimeError("FanGraphs HTML parse returned no tables")
    return _normalize(tables[0])

def safe_batting_stats(season: int) -> pd.DataFrame:
    # 1) Try pybaseball->FanGraphs with a few retries (handles transient 429/403)
    for i in range(3):
        try:
            df = batting_stats(season, season, qual=0)
            return _normalize(df)
        except Exception as e:
            status = getattr(getattr(e, "response", None), "status_code", None)
            # backoff a bit on 403/429; otherwise just a short retry
            sleep_for = (2.5 if status in (403, 429) else 1.5) * (i + 1) + random.random()
            time.sleep(sleep_for)
            last = e
    # 2) Direct FanGraphs HTML (custom UA)
    try:
        return _normalize(_fetch_fg_direct(season))
    except Exception:
        pass
    # 3) Baseball-Reference fallback
    df = batting_stats_bref(season, season)
    return _normalize(df)
