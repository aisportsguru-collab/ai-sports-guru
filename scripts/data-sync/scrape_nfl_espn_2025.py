#!/usr/bin/env python3
import time, requests, pandas as pd

SEASON = 2025
S = requests.Session()
S.headers.update({"User-Agent": "Mozilla/5.0 AiSportsGuru/1.0"})

def j(url, params=None):
    r = S.get(url, params=params, timeout=20); r.raise_for_status(); return r.json()

def list_teams():
    data = j("https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams")
    teams=[]
    for it in data.get("sports",[0])[0].get("leagues",[0])[0].get("teams",[]):
        t=it.get("team",{})
        abbr=t.get("abbreviation"); name=t.get("displayName") or abbr
        if abbr: teams.append({"team_id":abbr,"team_name":name})
    return teams

def team_roster(abbr):
    data = j(f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{abbr}/roster")
    out=[]
    for cat in data.get("athletes",[]):
        for p in cat.get("items",[]):
            out.append({
                "player_id": str(p.get("id")),
                "player_name": p.get("displayName"),
                "position": (p.get("position") or {}).get("abbreviation"),
                "team_id": abbr
            })
    return out

def main():
    teams = list_teams()
    # ---- players (roster rows; stats left NULL as placeholders) ----
    players=[]
    for t in teams:
        abbr=t["team_id"]
        for pl in team_roster(abbr):
            players.append({
                "season": SEASON, "player_id": pl["player_id"], "player_name": pl["player_name"],
                "team_id": abbr, "team_name": abbr, "position": pl.get("position"), "age": None,
                "games_played": None, "games_started": None,
                "snap_pct_offense": None, "snap_pct_defense": None, "snap_pct_st": None,
                "pass_attempts": None, "pass_completions": None, "pass_yards": None, "pass_tds": None,
                "interceptions": None, "sacks_taken": None, "sack_yards_lost": None, "pass_first_downs": None,
                "pass_air_yards": None, "pass_yac": None,
                "rush_attempts": None, "rush_yards": None, "rush_tds": None, "rush_first_downs": None,
                "rush_yac": None, "rush_yco": None,
                "targets": None, "receptions": None, "rec_yards": None, "rec_tds": None, "rec_first_downs": None,
                "air_yards": None, "yac": None,
                "fgm": None, "fga": None, "xpm": None, "xpa": None,
                "punt_yards": None, "punt_avg": None,
                "kick_ret_yards": None, "punt_ret_yards": None,
                "adot": None, "target_share": None, "air_yards_share": None,
                "tackles_solo": None, "tackles_ast": None, "tackles_total": None,
                "tfl": None, "qb_hits": None, "sacks": None, "passes_defended": None, "ints": None,
                "forced_fumbles": None, "fumbles": None, "fumbles_lost": None,
                "ngs_avg_separation": None, "ngs_top_speed": None,
                "pff_offense_grade": None, "pff_pass_grade": None, "pff_run_grade": None, "pff_coverage_grade": None
            })
        time.sleep(0.02)

    pd.DataFrame(players).to_csv("nfl_players.csv", index=False)

    # ---- teams (full schema columns, mostly NULL placeholders) ----
    rows=[]
    for t in teams:
        rows.append({
            "season": SEASON, "team_id": t["team_id"], "team_name": t["team_name"],
            "conference": None, "division": None,
            "games_played": None, "wins": None, "losses": None, "ties": None,
            "points_for": None, "points_against": None,
            "yards_for": None, "yards_against": None,
            "plays_for": None, "plays_against": None,
            "first_downs_for": None, "first_downs_against": None,
            "pass_yards_for": None, "rush_yards_for": None,
            "pass_yards_against": None, "rush_yards_against": None,
            "turnovers": None, "takeaways": None,
            "penalties": None, "penalty_yards": None,
            "epa_per_play_offense": None, "epa_per_play_defense": None,
            "success_rate_offense": None, "success_rate_defense": None,
            "dvoa_total": None, "dvoa_offense": None, "dvoa_defense": None,
            "pff_team_grade_offense": None, "pff_team_grade_defense": None
        })
    teams_df = pd.DataFrame(rows)
    teams_df.to_csv("nfl_teams.csv", index=False)
    print(f"Wrote nfl_players.csv ({len(players)} rows) and nfl_teams.csv ({len(teams_df)} rows) for {SEASON}")

if __name__ == "__main__":
    main()
