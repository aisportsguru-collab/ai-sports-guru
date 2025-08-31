#!/usr/bin/env python3
"""
NCAAF injuries fetcher (CFBD primary).
- Uses CollegeFootballData /injuries endpoint (season+week scanning).
- Caches responses on disk to stay well under monthly quotas.
- Writes /tmp/ncaaf_injuries.csv for upsert.

Env:
  CFBD_API_KEY       (required)
  INJURY_SEASONS     (optional; "2025,2024" etc; defaults to current year)
  CFBD_CACHE_DIR     (optional; cache dir; default ~/.cache/aisg-cfbd)
"""
import os, sys, csv, time, json, hashlib, pathlib
from datetime import datetime
from typing import Dict, Any, List
import requests

API = "https://api.collegefootballdata.com"
KEY = os.getenv("CFBD_API_KEY")
HEADERS = {"Authorization": f"Bearer {KEY}"} if KEY else None
if not KEY:
    print("ERROR: CFBD_API_KEY is not set", file=sys.stderr)
    sys.exit(1)

try:
    CY = datetime.utcnow().year
except Exception:
    CY = int(time.strftime("%Y"))
SEASONS = [int(s.strip()) for s in os.getenv("INJURY_SEASONS", str(CY)).split(",") if s.strip().isdigit()] or [CY]

CACHE_DIR = os.getenv("CFBD_CACHE_DIR", os.path.expanduser("~/.cache/aisg-cfbd"))
pathlib.Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)

def _ckey(url: str, params: Dict[str, Any]) -> str:
    raw = url + "|" + "&".join(f"{k}={v}" for k, v in sorted((params or {}).items()))
    return hashlib.sha256(raw.encode()).hexdigest()

def cache_get(url: str, params: Dict[str, Any], ttl_seconds: int):
    fn = os.path.join(CACHE_DIR, _ckey(url, params) + ".json")
    try:
        st = os.stat(fn)
        if time.time() - st.st_mtime < ttl_seconds:
            with open(fn, "r") as f:
                return json.load(f)
    except FileNotFoundError:
        return None
    except OSError:
        return None
    return None

def cache_set(url: str, params: Dict[str, Any], data: Any):
    fn = os.path.join(CACHE_DIR, _ckey(url, params) + ".json")
    tmp = fn + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.replace(tmp, fn)

def safe_json(r: requests.Response):
    # CFBD sometimes serves empty or HTML bodies; treat as empty list
    try:
        if r.headers.get("content-type","").startswith("application/json"):
            return r.json()
        # HTML or blank => no data
        text = (r.text or "").strip()
        if not text:
            return []
        if text.startswith("<") or text.startswith("<?xml"):
            return []
        # try JSON anyway
        return json.loads(text)
    except Exception:
        return []

def get(url: str, params: Dict[str, Any], ttl_seconds: int):
    c = cache_get(url, params, ttl_seconds)
    if c is not None:
        return c
    last = None
    for i in range(4):
        r = requests.get(url, params=params, headers=HEADERS, timeout=60)
        if r.status_code == 200:
            data = safe_json(r)
            cache_set(url, params, data)
            return data
        last = r
        time.sleep(1 + i)
    if last is not None and last.status_code == 401:
        print("CFBD injuries 401 Unauthorized; skipping.", file=sys.stderr)
        return []
    return []

def norm_text(x):
    if x is None:
        return None
    s = str(x).strip()
    return s or None

def to_row(season: int, week: int, trow: Dict[str, Any]) -> Dict[str, Any]:
    # CFBD injuries typically: team, player, position, status, etc.
    team = norm_text(trow.get("team"))
    player = norm_text(trow.get("player"))
    pos = norm_text(trow.get("position"))
    status = norm_text(trow.get("status") or trow.get("injuryStatus"))
    body = norm_text(trow.get("bodyPart"))
    desc = norm_text(trow.get("description") or trow.get("details"))
    pid = norm_text(trow.get("id") or trow.get("playerId"))
    return {
        "season": season,
        "week": week if week is not None else 0,
        "team": team,
        "player_id": pid,
        "player_name": player or "",
        "position": pos,
        "report_status": status,
        "practice_status": None,
        "designation": None,
        "body_part": body,
        "description": desc,
        "source": "cfbd",
        "date_updated": datetime.utcnow().isoformat() + "Z"
    }

def main():
    out = "/tmp/ncaaf_injuries.csv"
    fields = ["season","week","team","player_id","player_name","position",
              "report_status","practice_status","designation","body_part",
              "description","source","date_updated"]
    rows: List[Dict[str, Any]] = []

    for season in SEASONS:
        ttl = 60*60*12 if season == max(SEASONS) else 60*60*24*21
        for wk in range(0, 21):
            js = get(f"{API}/injuries", {"year": season, "week": wk}, ttl)
            if not js:
                continue
            for item in js:
                r = to_row(season, wk, item)
                if r["team"] and r["player_name"]:
                    rows.append(r)
        time.sleep(0.2)

    # lightweight de-dupe by (season, week, team, player_id/name)
    seen = set()
    deduped = []
    for r in rows:
        key = (r["season"], r["week"], r["team"], r.get("player_id") or r["player_name"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(r)

    os.makedirs("/tmp", exist_ok=True)
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in deduped:
            w.writerow(r)

    print(f"Wrote {out} with {len(deduped)} rows across seasons {SEASONS}")

if __name__ == "__main__":
    main()
