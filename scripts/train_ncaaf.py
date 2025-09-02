import os
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
from supabase import create_client

# Env
url = os.environ["SUPABASE_URL"]
key = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not key:
    raise RuntimeError("Missing SUPABASE_SERVICE_ROLE (or SUPABASE_SERVICE_ROLE_KEY)")

# Client
supabase = create_client(url, key)

# Pull data
teams = supabase.table("ncaaf_teams").select("*").execute().data
players = supabase.table("ncaaf_players").select("*").execute().data

df_teams = pd.DataFrame(teams)
df_players = pd.DataFrame(players)

# Aggregate player features to team level
agg = df_players.groupby("team_id").mean(numeric_only=True).reset_index()

# Merge on team identifier (handle schema differences)
merge_key = "team_id" if "team_id" in df_teams.columns else "id"
df = df_teams.merge(agg, left_on=merge_key, right_on="team_id", how="left")

# Basic cleanup
df = df.fillna(0)

# Simple demo features/labels (replace with real engineered targets later)
X = df.select_dtypes(include="number").drop(columns=["team_id"], errors="ignore")
y = (X.sum(axis=1) > X.sum(axis=1).median()).astype(int)

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Model
model = xgb.XGBClassifier(eval_metric="logloss", use_label_encoder=False)
model.fit(X_train, y_train)
preds = model.predict(X_test)

# Report
acc = accuracy_score(y_test, preds)
print("NCAAF model accuracy:", acc)

# Save
os.makedirs("backend/model", exist_ok=True)
joblib.dump(model, "backend/model/ncaaf_ml_xgb_v1.bin")
