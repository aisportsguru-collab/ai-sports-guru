import os
import numpy as np
import pandas as pd
from supabase import create_client
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib

# --- Supabase client ---
url = os.environ["SUPABASE_URL"]
key = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not key:
    raise RuntimeError("Missing SUPABASE_SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY in env.")
supabase = create_client(url, key)

# --- Load tables ---
teams = supabase.table("mlb_teams").select("*").execute().data
players = supabase.table("mlb_players").select("*").execute().data

df_teams = pd.DataFrame(teams)
df_players = pd.DataFrame(players)

if df_teams.empty:
    raise RuntimeError("mlb_teams came back empty")
if df_players.empty:
    raise RuntimeError("mlb_players came back empty")

# --- Env overrides for join keys ---
player_team_key_env = os.getenv("MLB_PLAYERS_TEAM_KEY")     # e.g., last_known_team_id OR last_known_team_abbr
teams_id_key_env     = os.getenv("MLB_TEAMS_ID_KEY", "team_id")
teams_name_key_env   = os.getenv("MLB_TEAMS_NAME_KEY", "team_abbr")

# --- Candidate columns (expanded to include your schema) ---
player_team_candidates = [c for c in [
    player_team_key_env,
    "last_known_team_id",
    "last_known_team_abbr",
    "team_id","team","teamId","teamid","team_name","team_abbr","abbr","team_code"
] if c]

teams_id_candidates   = [c for c in [teams_id_key_env, "team_id","id","teamId"] if c]
teams_name_candidates = [c for c in [teams_name_key_env, "team_abbr","abbr","team_code","team_name"] if c]

# --- Select actual columns that exist ---
p_key = next((c for c in player_team_candidates if c in df_players.columns), None)
if not p_key:
    raise KeyError(f"Could not find a team key in mlb_players; checked {player_team_candidates}")

t_id = next((c for c in teams_id_candidates if c in df_teams.columns), None)
t_nm = next((c for c in teams_name_candidates if c in df_teams.columns), None)

# --- Normalize types for join attempts ---
def try_join_on_ids():
    # Only attempt if both columns exist
    if p_key is None or t_id is None:
        return None
    left = df_players.copy()
    right = df_teams.copy()

    # Coerce both to numeric (NaN where not possible)
    left["_join_id"]  = pd.to_numeric(left[p_key], errors="coerce")
    right["_join_id"] = pd.to_numeric(right[t_id], errors="coerce")

    before = len(left)
    merged = left.merge(right, on="_join_id", how="left", suffixes=("_player","_team"))
    matched = merged["_join_id"].notna().sum()
    return merged, matched, before

def try_join_on_names():
    if p_key is None or t_nm is None:
        return None
    left = df_players.copy()
    right = df_teams.copy()

    # Coerce both to uppercase string without spaces for robust matching
    left["_join_nm"]  = left[p_key].astype(str).str.upper().str.strip().str.replace(r"\s+","", regex=True)
    right["_join_nm"] = right[t_nm].astype(str).str.upper().str.strip().str.replace(r"\s+","", regex=True)

    before = len(left)
    merged = left.merge(right, on="_join_nm", how="left", suffixes=("_player","_team"))
    matched = merged["_join_nm"].notna().sum()
    return merged, matched, before

chosen = None
log = {}

# Prefer ID join if p_key looks like an id
if "id" in p_key.lower():
    trial = try_join_on_ids()
    if trial:
        merged, matched, before = trial
        if matched >= before * 0.6:  # 60%+ match rate -> accept
            chosen = ("id", merged)
            log["join"] = f"ID join via players.{p_key} -> teams.{t_id}"
        else:
            # fallback to names
            trial2 = try_join_on_names()
            if trial2:
                merged2, matched2, before2 = trial2
                if matched2 >= matched:  # pick better match
                    chosen = ("name", merged2)
                    log["join"] = f"Name join via players.{p_key} -> teams.{t_nm}"
                else:
                    chosen = ("id", merged)
                    log["join"] = f"ID join via players.{p_key} -> teams.{t_id} (lower match)"
else:
    # Prefer name/abbr join first
    trial = try_join_on_names()
    if trial:
        merged, matched, before = trial
        if matched >= before * 0.6:
            chosen = ("name", merged)
            log["join"] = f"Name join via players.{p_key} -> teams.{t_nm}"
        else:
            trial2 = try_join_on_ids()
            if trial2:
                merged2, matched2, before2 = trial2
                if matched2 >= matched:
                    chosen = ("id", merged2)
                    log["join"] = f"ID join via players.{p_key} -> teams.{t_id}"
                else:
                    chosen = ("name", merged)
                    log["join"] = f"Name join via players.{p_key} -> teams.{t_nm} (lower match)"

if not chosen:
    raise RuntimeError("Could not join mlb_players to mlb_teams on either ID or name/abbr.")

mode, merged = chosen
print(f"[train_mlb] Join chosen: {log.get('join','(unknown)')}  (mode={mode})")

# --- Aggregate to team level (mean over players), then merge back to teams to ensure 1 row/team ---
player_feats = merged.groupby("_join_id" if mode=="id" else "_join_nm").mean(numeric_only=True).reset_index()
# Keep team identity columns from teams side
team_identity_cols = ["team_id","team_name","team_abbr","league","division","season"]
team_identity_cols = [c for c in team_identity_cols if c in df_teams.columns]

if mode == "id":
    team_key = "_join_id"
    teams_key = "_join_id"
    df_teams["_join_id"] = pd.to_numeric(df_teams[t_id], errors="coerce")
else:
    team_key = "_join_nm"
    teams_key = "_join_nm"
    df_teams["_join_nm"] = df_teams[t_nm].astype(str).str.upper().str.strip().str.replace(r"\s+","", regex=True)

df = df_teams.merge(player_feats, left_on=teams_key, right_on=team_key, how="left")

# --- Target + features (toy example) ---
# Use team record stats as proxy target: win% > .5 -> 1 else 0
win_col = "wins" if "wins" in df.columns else None
games_col = "games" if "games" in df.columns else None
if not win_col or not games_col:
    # fallback: classify top half of OPS as 1 vs bottom half 0
    target_series = (df["team_ops"] > df["team_ops"].median()).astype(int) if "team_ops" in df.columns else pd.Series(np.random.randint(0,2,size=len(df)))
else:
    target_series = ((df[win_col] / df[games_col].replace(0, np.nan)) > 0.5).fillna(0).astype(int)

# Drop identifiers / non-numerics from features
drop_cols = set(team_identity_cols + [teams_key, team_key]) & set(df.columns)
X = df.drop(columns=list(drop_cols), errors="ignore").select_dtypes(include=[np.number]).fillna(0)
y = target_series

# Basic split/train
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y if y.nunique()==2 else None)
dtrain = xgb.DMatrix(X_train, label=y_train)
dtest  = xgb.DMatrix(X_test, label=y_test)

params = {"objective":"binary:logistic", "eval_metric":"logloss", "max_depth":4, "eta":0.2, "subsample":0.9, "colsample_bytree":0.9}
bst = xgb.train(params, dtrain, num_boost_round=120)

preds = (bst.predict(dtest) >= 0.5).astype(int)
acc = accuracy_score(y_test, preds)
print(f"MLB model accuracy: {acc:.2f}")

os.makedirs("backend/model", exist_ok=True)
out_path = "backend/model/mlb_ml_xgb_v1.bin"
bst.save_model(out_path)
print(f"Saved model to {out_path}")
