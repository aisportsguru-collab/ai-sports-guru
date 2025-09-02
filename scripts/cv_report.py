#!/usr/bin/env python3
"""
Cross-validate league models directly from Supabase data and write summary metrics.

- Reads SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE from env.
- Pulls <league>_teams via PostgREST (REST) with auth fallback.
- Builds a feature matrix from numeric columns (auto-detected).
- Creates a season-balanced label by median-splitting a composite z-score.
- Runs 3-fold stratified CV with XGBoost (binary:logistic).
- Writes JSON to backend/model/<league>_cv_metrics.json

Usage:
  python3 scripts/cv_report.py <nfl|ncaaf|mlb>
"""

import os, sys, json, math, time
import numpy as np
import pandas as pd
import requests
from typing import Dict, Tuple, List

from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, roc_auc_score, log_loss, brier_score_loss

import xgboost as xgb


# ---------- ENV & AUTH ----------

def env_or_die(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        raise RuntimeError(f"Missing required env var: {name}")
    return v

SUPABASE_URL = env_or_die("SUPABASE_URL").rstrip("/")
ANON = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "").strip()
SR   = os.environ.get("SUPABASE_SERVICE_ROLE", "").strip()

def _headers(an: str, sr: str, mode: str) -> Dict[str, str]:
    """
    mode in {"anon/anon","anon/sr","sr/sr"}
    """
    if mode == "anon/anon":
        return {"apikey": an, "Authorization": f"Bearer {an}"}
    if mode == "anon/sr":
        return {"apikey": an, "Authorization": f"Bearer {sr}"}
    if mode == "sr/sr":
        return {"apikey": sr, "Authorization": f"Bearer {sr}"}
    raise ValueError("bad mode")

def choose_headers(url: str, anon: str, sr: str, probe_table: str) -> Dict[str, str]:
    """
    Try a few auth header combinations; return the first that can read 1 row.
    """
    modes = []
    if anon:
        modes.extend(["anon/anon", "anon/sr"])
    if sr:
        modes.append("sr/sr")

    last = None
    for m in modes:
        h = _headers(anon, sr, m)
        r = requests.get(
            f"{url}/rest/v1/{probe_table}",
            headers=h,
            params={"select": "team_id", "limit": "1"},
            timeout=30,
        )
        if r.status_code == 200:
            print(f"Auth OK using headers mode: {m}")
            return h
        last = (m, r.status_code, r.text[:200])

    if last:
        mode, code, body = last
        print("\nSupabase REST auth failed.")
        print(f"URL: {url}")
        print(f"Tried mode: {mode}")
        print(f"Status: {code}")
        print(f"Body: {body}\n")
    raise RuntimeError("Could not authenticate to Supabase REST.")


# ---------- REST HELPERS ----------

def rest_select(url: str, headers: Dict[str,str], table: str, select: str, limit: int = None) -> List[Dict]:
    params = {"select": select}
    if limit is not None:
        params["limit"] = str(limit)
    r = requests.get(f"{url}/rest/v1/{table}", headers=headers, params=params, timeout=60)
    if r.status_code != 200:
        raise RuntimeError(f"REST {table} failed {r.status_code}: {r.text[:300]}")
    return r.json()


# ---------- DATA / LABELING ----------

def league_tables(league: str) -> str:
    return f"{league}_teams"

ID_COL_CANDIDATES = [
    "team_id", "id", "teamId", "teamid", "abbr", "team_abbr", "team_code"
]
NAME_COL_CANDIDATES = ["team_name", "name"]
SEASON_COL_CANDIDATES = ["season", "year"]

def pick_first(df: pd.DataFrame, candidates: List[str]) -> str:
    for c in candidates:
        if c in df.columns:
            return c
    return ""

def build_label_season_balanced(df: pd.DataFrame, season_key: str, exclude_cols: List[str]) -> pd.Series:
    """
    Create a season-balanced binary label:
      1 if team's composite z-score >= median within its season, else 0.
    Composite z-score is the sum of standardized numeric feature columns (excluding id/name/season).
    """
    # choose numeric columns for scoring
    num_cols = [c for c in df.columns
                if c not in exclude_cols and pd.api.types.is_numeric_dtype(df[c])]

    if not num_cols:
        # if we cannot find any numeric columns, invent a zero-score column
        df = df.copy()
        df["__zero__"] = 0.0
        num_cols = ["__zero__"]

    # Standardize columns and sum
    zsum = pd.Series(0.0, index=df.index)
    for c in num_cols:
        v = pd.to_numeric(df[c], errors="coerce")
        z = (v - v.mean()) / (v.std(ddof=0) + 1e-9)
        zsum = zsum.add(z.fillna(0), fill_value=0)

    # median split per season
    labels = []
    for _, grp in df.groupby(season_key):
        idx = grp.index
        s = zsum.loc[idx]
        cutoff = np.nanmedian(s)
        y = (s >= cutoff).astype(int)

        # ensure both classes present (flip 1 nearest to cutoff if necessary)
        if y.nunique() < 2 and len(y) > 1:
            j = (s - cutoff).abs().sort_values().index[0]
            y.loc[j] = 1 - int(y.loc[j])

        labels.append(y)

    return pd.concat(labels).sort_index().astype(int)

def load_frames(url: str, headers: Dict[str,str], league: str) -> Tuple[pd.DataFrame, pd.Series, pd.Series, List[str]]:
    teams_table = league_tables(league)
    rows = rest_select(url, headers, teams_table, "*")
    if not rows:
        raise RuntimeError(f"No data returned from {teams_table}")

    df = pd.DataFrame(rows)

    # Identify key columns
    team_key   = pick_first(df, ID_COL_CANDIDATES) or "team_id"
    name_key   = pick_first(df, NAME_COL_CANDIDATES) or "team_name"
    season_key = pick_first(df, SEASON_COL_CANDIDATES) or "season"

    # Ensure presence of expected columns
    if team_key not in df:   df[team_key] = ""
    if name_key not in df:   df[name_key] = ""
    if season_key not in df: df[season_key] = np.nan

    # Robust numeric casting (no deprecation warnings)
    for c in df.columns:
        if c not in (team_key, season_key, name_key):
            try:
                df[c] = pd.to_numeric(df[c])
            except Exception:
                # leave text/object columns alone
                pass

    # Features: keep ONLY numeric columns (safe & portable)
    exclude = {team_key, season_key, name_key}
    feature_cols = [c for c in df.columns
                    if c not in exclude and pd.api.types.is_numeric_dtype(df[c])]

    if not feature_cols:
        # fabricate a single zero feature to let the pipeline run
        df["__feat0__"] = 0.0
        feature_cols = ["__feat0__"]

    # Label: season-balanced composite z-score median split
    y = build_label_season_balanced(df, season_key, exclude_cols=list(exclude))

    # Final matrices
    X = df[feature_cols].copy()
    X = X.fillna(0)
    seasons = pd.to_numeric(df[season_key], errors="coerce")

    return X, y, seasons, feature_cols


# ---------- CV / METRICS ----------

def _to_py(obj):
    """Convert numpy types to plain Python for JSON serialization."""
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        v = float(obj)
        if math.isnan(v):
            return float("nan")
        return v
    if isinstance(obj, (np.ndarray,)):
        return [ _to_py(x) for x in obj.tolist() ]
    return obj

def run_cv(url: str, anon: str, sr: str, league: str) -> None:
    if league not in ("nfl", "ncaaf", "mlb"):
        raise RuntimeError("league must be one of nfl|ncaaf|mlb")

    headers = choose_headers(url, anon, sr, league_tables(league))
    X, y, seasons, feat_cols = load_frames(url, headers, league)

    # 3-fold stratified CV
    skf = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)

    accs, aucs, logs, briers = [], [], [], []
    metrics = {"folds": []}

    # XGBoost params
    params = {
        "objective": "binary:logistic",
        "eval_metric": "logloss",
        "max_depth": 3,
        "eta": 0.1,
        "subsample": 0.9,
        "colsample_bytree": 0.9,
        "lambda": 1.0,
        "alpha": 0.0,
        "seed": 42,
    }

    for fold, (tr, te) in enumerate(skf.split(X, y), start=1):
        Xtr, Xte = X.iloc[tr], X.iloc[te]
        ytr, yte = y.iloc[tr], y.iloc[te]

        dtr = xgb.DMatrix(Xtr.values, label=ytr.values, feature_names=feat_cols)
        dte = xgb.DMatrix(Xte.values, label=yte.values, feature_names=feat_cols)

        bst = xgb.train(params, dtr, num_boost_round=150)
        p   = bst.predict(dte)

        # Metrics (guard edge cases)
        acc = accuracy_score(yte, (p >= 0.5).astype(int))

        try:
            auc = roc_auc_score(yte, p)
        except Exception:
            auc = float("nan")

        try:
            ll = log_loss(yte, np.clip(p, 1e-6, 1-1e-6))
        except Exception:
            ll = float("nan")

        try:
            br = brier_score_loss(yte, p)
        except Exception:
            br = float("nan")

        metrics["folds"].append({
            "fold": fold,
            "accuracy": _to_py(acc),
            "roc_auc":  _to_py(auc),
            "log_loss": _to_py(ll),
            "brier":    _to_py(br),
        })
        accs.append(acc); aucs.append(auc); logs.append(ll); briers.append(br)

    summary = {
        "accuracy_mean": _to_py(np.nanmean(accs)),
        "roc_auc_mean":  _to_py(np.nanmean(aucs)),
        "log_loss_mean": _to_py(np.nanmean(logs)),
        "brier_mean":    _to_py(np.nanmean(briers)),
        "n":             int(len(y)),
        "splits":        3,
        "seasons":       sorted([int(s) for s in seasons.dropna().unique().tolist()]),
    }
    metrics["summary"] = summary

    os.makedirs("backend/model", exist_ok=True)
    out = f"backend/model/{league}_cv_metrics.json"
    with open(out, "w") as f:
        json.dump(metrics, f, indent=2)
    print(json.dumps(summary, indent=2))
    print(f"Wrote detailed folds to {out}")


# ---------- MAIN ----------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/cv_report.py <nfl|ncaaf|mlb>")
        sys.exit(1)
    league = sys.argv[1].lower().strip()
    run_cv(SUPABASE_URL, ANON, SR, league)
