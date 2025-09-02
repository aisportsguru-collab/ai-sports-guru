import os
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
from supabase import create_client

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_ROLE"]
supabase = create_client(url, key)

teams = supabase.table("nfl_teams").select("*").execute().data
players = supabase.table("nfl_players").select("*").execute().data

df_teams = pd.DataFrame(teams)
df_players = pd.DataFrame(players)

agg = df_players.groupby("team_id").mean(numeric_only=True).reset_index()

merge_key = "team_id" if "team_id" in df_teams.columns else "id"
df = df_teams.merge(agg, left_on=merge_key, right_on="team_id", how="left")

df = df.fillna(0)

X = df.select_dtypes(include="number").drop(columns=["team_id"], errors="ignore")
y = (X.sum(axis=1) > X.sum(axis=1).median()).astype(int)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = xgb.XGBClassifier(eval_metric="logloss", use_label_encoder=False)
model.fit(X_train, y_train)
preds = model.predict(X_test)

acc = accuracy_score(y_test, preds)
print("NFL model accuracy:", acc)

os.makedirs("backend/model", exist_ok=True)
joblib.dump(model, "backend/model/nfl_ml_xgb_v1.bin")
