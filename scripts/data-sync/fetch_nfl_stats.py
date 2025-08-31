#!/usr/bin/env python3
import sys
import pandas as pd

SEASONS = [2023, 2024]  # any season that 404s will be skipped

def load_lib():
    try:
        import nfl_data_py as nfl
        return nfl
    except Exception:
        print("Install deps first: pip install nfl_data_py pandas pyarrow", file=sys.stderr)
        raise

def import_weekly_safe(nfl, year):
    for fn in ("import_weekly_data", "__import_weekly"):
        if hasattr(nfl, fn):
            f = getattr(nfl, fn)
            try:
                return f([year])
            except Exception:
                pass
            try:
                df = f()
                if "season" in df.columns:
                    return df[df["season"] == year].copy()
                return df
            except Exception:
                pass
    raise AttributeError("No weekly import function found in nfl_data_py")

def first_existing(df, candidates):
    for c in candidates:
        if c in df.columns:
            return c
    return None

def main():
    nfl = load_lib()

    print("Downloading weekly player data per season...")
    parts, missing = [], []
    for yr in SEASONS:
        try:
            print(f"  - fetching {yr} ...", flush=True)
            df = import_weekly_safe(nfl, yr)
            if df is None or df.empty:
                print(f"    -> empty/no data for {yr}, skipping.")
                missing.append(yr)
                continue
            parts.append(df)
        except Exception as e:
            print(f"    -> failed for {yr}: {e.__class__.__name__}: {e}")
            missing.append(yr)

    if not parts:
        print("No seasons could be fetched. Exiting.", file=sys.stderr)
        sys.exit(2)

    weekly = pd.concat(parts, ignore_index=True)

    # ---------- Normalize key columns ----------
    season_col = first_existing(weekly, ["season","season_x","Season"])
    player_id_col = first_existing(weekly, ["player_id","gsis_id","gsis_player_id","pfr_id","nfl_id"])
    name_col = first_existing(weekly, ["player_name","player_display_name","name","full_name"])
    team_col = first_existing(weekly, ["team","recent_team","team_abbr","club","team_x"])
    pos_col = first_existing(weekly, ["position","position_group","pos"])
    week_col = first_existing(weekly, ["week","Week"])

    for need, col in [("season", season_col), ("player_id", player_id_col), ("player_name", name_col)]:
        if col is None:
            print(f"Required column missing for {need}. Aborting.", file=sys.stderr)
            sys.exit(3)

    work = pd.DataFrame()
    work["season"] = weekly[season_col].astype(int)
    work["player_id"] = weekly[player_id_col]
    work["player_name"] = weekly[name_col]
    work["team"] = weekly[team_col] if team_col else pd.NA
    work["position"] = weekly[pos_col] if pos_col else pd.NA
    work["week"] = weekly[week_col] if week_col else pd.NA

    def add(src, dst):
        if src in weekly.columns:
            work[dst] = weekly[src]

    # Passing
    add("attempts","attempts"); add("completions","completions")
    add("passing_yards","passing_yards"); add("passing_tds","passing_tds")
    add("interceptions","interceptions"); add("sacks","sacks"); add("sack_yards","sack_yards")
    add("passing_first_downs","passing_first_downs"); add("air_yards","air_yards"); add("yac","yac")
    # Rushing
    add("carries","carries"); add("rushing_yards","rushing_yards")
    add("rushing_tds","rushing_tds"); add("rushing_first_downs","rushing_first_downs")
    add("rushing_yac","rushing_yac"); add("rushing_yco","rushing_yco")
    # Receiving
    add("targets","targets"); add("receptions","receptions")
    add("receiving_yards","receiving_yards"); add("receiving_tds","receiving_tds")
    add("receiving_first_downs","receiving_first_downs")
    add("receiving_air_yards","receiving_air_yards"); add("receiving_yac","receiving_yac")
    # Defense
    if "tackles_solo" in weekly.columns: work["tackles_solo"] = weekly["tackles_solo"]
    if "tackles_assists" in weekly.columns: work["tackles_assists"] = weekly["tackles_assists"]
    elif "assist_tackles" in weekly.columns: work["tackles_assists"] = weekly["assist_tackles"]
    add("tfl","tfl"); add("qb_hits","qb_hits"); add("sacks","def_sacks")
    add("passes_defended","passes_defended")
    if "def_interceptions" in weekly.columns: work["def_interceptions"] = weekly["def_interceptions"]
    add("forced_fumbles","forced_fumbles"); add("fumbles","fumbles"); add("fumbles_lost","fumbles_lost")
    # Special teams
    add("fgm","fgm"); add("fga","fga"); add("xpm","xpm"); add("xpa","xpa")
    add("punt_yards","punt_yards"); add("punt_avg","punt_avg")
    add("kick_return_yards","kick_return_yards"); add("punt_return_yards","punt_return_yards")

    # ---------- Aggregation ----------
    agg_map = {}
    if "week" in work.columns: agg_map["week"] = "nunique"
    for c in ["attempts","completions","passing_yards","passing_tds","interceptions","sacks","sack_yards",
              "passing_first_downs","air_yards","yac",
              "carries","rushing_yards","rushing_tds","rushing_first_downs","rushing_yac","rushing_yco",
              "targets","receptions","receiving_yards","receiving_tds","receiving_first_downs","receiving_air_yards","receiving_yac",
              "tackles_solo","tackles_assists","tfl","qb_hits","def_sacks","passes_defended","def_interceptions",
              "forced_fumbles","fumbles","fumbles_lost",
              "fgm","fga","xpm","xpa","punt_yards","punt_avg","kick_return_yards","punt_return_yards"]:
        if c in work.columns:
            agg_map[c] = "sum"

    keys = ["season","player_id","player_name","team","position"]
    grouped = work.groupby(keys, dropna=False).agg(agg_map).reset_index()

    # Rename to final schema
    rename = {
        "attempts":"pass_attempts","completions":"pass_completions",
        "passing_yards":"pass_yards","passing_tds":"pass_tds",
        "sacks":"sacks_taken","sack_yards":"sack_yards_lost",
        "air_yards":"pass_air_yards","yac":"pass_yac",
        "carries":"rush_attempts","rushing_yards":"rush_yards","rushing_tds":"rush_tds",
        "rushing_first_downs":"rush_first_downs","rushing_yac":"rush_yac","rushing_yco":"rush_yco",
        "receiving_yards":"rec_yards","receiving_tds":"rec_tds",
        "receiving_first_downs":"rec_first_downs","receiving_air_yards":"air_yards","receiving_yac":"yac",
        "tackles_assists":"tackles_ast","def_sacks":"sacks",
        "def_interceptions":"ints",
        "week":"games_played"
    }
    grouped = grouped.rename(columns=rename)

    # Safe zero series helper
    def col_or_zero(df, name):
        if name in df.columns:
            return df[name].fillna(0)
        return pd.Series(0, index=df.index, dtype="float64")

    grouped["tackles_total"] = col_or_zero(grouped, "tackles_solo") + col_or_zero(grouped, "tackles_ast")

    grouped = grouped.rename(columns={"team":"team_id"})
    grouped["team_name"] = grouped["team_id"]

    # Ensure all expected columns exist
    expected_player_cols = [
        "season","player_id","player_name","team_id","team_name","position","age",
        "games_played","games_started","snap_pct_offense","snap_pct_defense","snap_pct_st",
        "pass_attempts","pass_completions","pass_yards","pass_tds","interceptions","sacks_taken","sack_yards_lost","pass_first_downs","pass_air_yards","pass_yac",
        "rush_attempts","rush_yards","rush_tds","rush_first_downs","rush_yac","rush_yco",
        "targets","receptions","rec_yards","rec_tds","rec_first_downs","air_yards","yac","adot","target_share","air_yards_share",
        "tackles_solo","tackles_ast","tackles_total","tfl","qb_hits","sacks","passes_defended","ints","forced_fumbles","fumbles","fumbles_lost",
        "fgm","fga","xpm","xpa","punt_yards","punt_avg","kick_ret_yards","punt_ret_yards",
        "ngs_avg_separation","ngs_top_speed","pff_offense_grade","pff_pass_grade","pff_run_grade","pff_coverage_grade"
    ]
    for col in expected_player_cols:
        if col not in grouped.columns:
            grouped[col] = pd.NA

    grouped[expected_player_cols].to_csv("nfl_players.csv", index=False)

    # ---------- TEAM-SEASON ----------
    team_df = work.copy()
    team_agg_cols = {}
    for c in ["passing_yards","rushing_yards","passing_tds","rushing_tds","interceptions","fumbles"]:
        if c in team_df.columns:
            team_agg_cols[c] = "sum"
    if not team_agg_cols:
        for c in ["passing_yards","rushing_yards"]:
            if c in team_df.columns:
                team_agg_cols[c] = "sum"

    t = team_df.groupby(["season","team"], dropna=False).agg(team_agg_cols).reset_index()
    if "passing_yards" in t.columns: t = t.rename(columns={"passing_yards":"pass_yards_for"})
    else: t["pass_yards_for"] = pd.NA
    if "rushing_yards" in t.columns: t = t.rename(columns={"rushing_yards":"rush_yards_for"})
    else: t["rush_yards_for"] = pd.NA

    t = t.rename(columns={"team":"team_id"})
    t["team_name"] = t["team_id"]

    for c in ["conference","division","games_played","wins","losses","ties","points_for","points_against",
              "yards_against","plays_for","plays_against","first_downs_for","first_downs_against",
              "pass_yards_against","rush_yards_against","turnovers","takeaways","penalties","penalty_yards",
              "epa_per_play_offense","epa_per_play_defense","success_rate_offense","success_rate_defense",
              "dvoa_total","dvoa_offense","dvoa_defense","pff_team_grade_offense","pff_team_grade_defense",
              "yards_for"]:
        if c not in t.columns:
            t[c] = pd.NA

    if pd.api.types.is_numeric_dtype(t.get("pass_yards_for")) and pd.api.types.is_numeric_dtype(t.get("rush_yards_for")):
        t["yards_for"] = t["pass_yards_for"].fillna(0) + t["rush_yards_for"].fillna(0)

    team_cols = [
        "season","team_id","team_name","conference","division",
        "games_played","wins","losses","ties","points_for","points_against",
        "yards_for","yards_against","plays_for","plays_against","first_downs_for","first_downs_against",
        "pass_yards_for","rush_yards_for","pass_yards_against","rush_yards_against",
        "turnovers","takeaways","penalties","penalty_yards",
        "epa_per_play_offense","epa_per_play_defense","success_rate_offense","success_rate_defense",
        "dvoa_total","dvoa_offense","dvoa_defense","pff_team_grade_offense","pff_team_grade_defense"
    ]
    t[team_cols].to_csv("nfl_teams.csv", index=False)

    print("Wrote nfl_players.csv and nfl_teams.csv")
    if missing:
        print(f"NOTE: Skipped seasons with no data: {missing}")

if __name__ == "__main__":
    main()
