import _env  # auto-loads .env.predict if not already in env
import os, sys, math
from datetime import datetime, timedelta, timezone
from typing import Optional
import pandas as pd
from supabase import create_client, Client

# ---------------- Env & Client ----------------
URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not URL or not KEY:
    print("Missing SUPABASE_URL or service role key in env.", file=sys.stderr)
    sys.exit(1)

sb: Client = create_client(URL, KEY)

# ---------------- Helpers ----------------
def norm_pick(row, market):
    """
    Normalize picks into (side, value).
    moneyline: ('HOME'|'AWAY', None)
    spread:    ('HOME'|'AWAY', number)   e.g. 'HOME -3' -> ('HOME', -3)
    total:     ('OVER'|'UNDER', number)  e.g. 'Over 45.5' -> ('OVER', 45.5)
    """
    p = (row.get("pick_moneyline") if market=="moneyline"
         else row.get("pick_spread") if market=="spread"
         else row.get("pick_total"))
    if not p:
        return None, None

    s = str(p).strip().upper()
    if market == "moneyline":
        if s in ("HOME","AWAY"):
            return s, None
        return None, None

    if market == "spread":
        parts = s.replace("–","-").split()
        if len(parts) == 2 and parts[0] in ("HOME","AWAY"):
            try:
                val = float(parts[1].replace("+",""))
                if parts[1].startswith("-"):
                    val = -abs(val)
                return parts[0], val
            except:
                return None, None
        return None, None

    if market == "total":
        parts = s.replace("–","-").split()
        if len(parts) == 2 and parts[0] in ("OVER","UNDER"):
            try:
                return parts[0], float(parts[1].replace("+",""))
            except:
                return None, None
        if s.startswith("OVER ") or s.startswith("UNDER "):
            head, val = s.split()
            try:
                return head, float(val)
            except:
                return None, None
        return None, None

    return None, None

def eval_moneyline(home_score, away_score, pick_side):
    if home_score is None or away_score is None or pick_side is None:
        return "LOSS", False, float("nan")
    if home_score == away_score:
        return "PUSH", None, 0.0
    winner = "HOME" if home_score > away_score else "AWAY"
    ok = (winner == pick_side)
    margin = abs(home_score - away_score)
    return ("WIN" if ok else "LOSS"), ok, float(margin)

def eval_spread(home_score, away_score, pick_side, spread_line):
    if any(v is None for v in [home_score, away_score, pick_side, spread_line]):
        return "LOSS", False, float("nan")
    diff = home_score - away_score
    if pick_side == "HOME":
        adjusted = diff + (-spread_line)
    else:
        adjusted = (-diff) + (spread_line)
    if math.isclose(adjusted, 0.0, abs_tol=1e-9):
        return "PUSH", None, 0.0
    ok = adjusted > 0
    return ("WIN" if ok else "LOSS"), ok, float(adjusted)

def eval_total(home_score, away_score, pick_side, total_points):
    if any(v is None for v in [home_score, away_score, pick_side, total_points]):
        return "LOSS", False, float("nan")
    total = (home_score or 0) + (away_score or 0)
    delta = total - total_points
    if math.isclose(delta, 0.0, abs_tol=1e-9):
        return "PUSH", None, 0.0
    ok = (delta > 0 and pick_side == "OVER") or (delta < 0 and pick_side == "UNDER")
    return ("WIN" if ok else "LOSS"), ok, float(delta)

def eval_row(pred: dict, res: dict, market: str):
    home = res.get("home_score")
    away = res.get("away_score")
    pick_side, pick_value = norm_pick(pred, market)
    if market == "moneyline":
        return pick_side, pick_value, *eval_moneyline(home, away, pick_side)
    if market == "spread":
        spread_line = pick_value
        if spread_line is None:
            spread_line = pred.get("spread_line")
            try:
                spread_line = float(spread_line) if spread_line is not None else None
            except:
                spread_line = None
        return pick_side, pick_value, *eval_spread(home, away, pick_side, spread_line)
    if market == "total":
        tot = pick_value
        if tot is None:
            tot = pred.get("total_points")
            try:
                tot = float(tot) if tot is not None else None
            except:
                tot = None
        return pick_side, pick_value, *eval_total(home, away, pick_side, tot)
    return None, None, "LOSS", False, float("nan")

def extract_dt(row):
    # Try common datetime keys (your schema lacks game_date, so be flexible)
    for key in ("game_datetime", "start", "start_time", "final_at", "game_time", "date"):
        if key in row and row[key]:
            try:
                return pd.to_datetime(row[key], utc=True)
            except Exception:
                pass
    return None

# ---------------- Load finals (last 30d) ----------------
since = datetime.now(timezone.utc) - timedelta(days=30)
res_all = sb.table("game_results").select("*").execute()
raw_results = res_all.data or []

results = {}
for r in raw_results:
    dt = extract_dt(r)
    if dt is None:  # skip rows without parseable datetime
        continue
    if dt >= since:
        gid = r.get("game_id") or r.get("id")
        if gid:
            results[gid] = r

if not results:
    print("No recent game_results found; nothing to evaluate.")
    sys.exit(0)

# ---------------- Load predictions for those games ----------------
ids = list(results.keys())
preds = []
for i in range(0, len(ids), 800):
    chunk = ids[i:i+800]
    q = sb.table("ai_research_predictions").select("*").in_("game_id", chunk).execute()
    preds.extend(q.data or [])

if not preds:
    print("No predictions matching recent results; nothing to evaluate.")
    sys.exit(0)

# ---------------- Evaluate & upsert per-market outcomes ----------------
rows = []
for p in preds:
    league = p.get("sport") or p.get("league")
    gid = p.get("game_id")
    if not gid or gid not in results:
        continue
    r = results[gid]
    game_dt = extract_dt(r) or datetime.now(timezone.utc)

    for market in ("moneyline", "spread", "total"):
        pick_side, pick_val, outcome, is_ok, margin = eval_row(p, r, market)
        if pick_side is None:
            continue
        rows.append({
          "league": league,
          "game_id": gid,
          "market": market,
          "pick": p.get(f"pick_{'moneyline' if market=='moneyline' else market}"),
          "pick_side": pick_side,
          "pick_value": pick_val,
          "result": outcome,
          "is_correct": is_ok,
          "margin": margin,
          "game_start": game_dt.isoformat(),
          "prediction_id": p.get("id")
        })

if rows:
    _ = sb.table("model_eval").upsert(rows, on_conflict="league,game_id,market").execute()
    print(f"Evaluated {len(rows)} market predictions.")
else:
    print("No evaluable picks were found.")
    sys.exit(0)

# ---------------- Daily rollups to model_metrics_daily ----------------
ev = sb.table("model_eval").select("league,market,game_start,result").gte(
    "game_start", since.date().isoformat()
).execute().data or []

if not ev:
    print("No evaluated rows to roll up.")
    sys.exit(0)

df = pd.DataFrame(ev)
df["stat_date"] = pd.to_datetime(df["game_start"]).dt.date

agg_rows = []
for (d, league, market), g in df.groupby(["stat_date","league","market"]):
    wins = int((g["result"]=="WIN").sum())
    pushes = int((g["result"]=="PUSH").sum())
    losses = int((g["result"]=="LOSS").sum())
    denom = max(wins+losses, 1)  # exclude pushes from denom
    hit = wins / denom
    agg_rows.append({
        "stat_date": str(d),
        "league": league,
        "market": market,
        "n": int(len(g)),
        "wins": wins,
        "pushes": pushes,
        "losses": losses,
        "hit_rate": round(hit, 4)
    })

if agg_rows:
    _ = sb.table("model_metrics_daily").upsert(
        agg_rows, on_conflict="stat_date,league,market"
    ).execute()
    print(f"Rolled up {len(agg_rows)} daily metric rows.")
else:
    print("No rollups produced.")
