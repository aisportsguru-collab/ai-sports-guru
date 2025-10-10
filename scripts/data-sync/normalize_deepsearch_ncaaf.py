#!/usr/bin/env python3
import csv, sys, re, os, argparse
from datetime import datetime

# ---- Config: alias maps so we can handle many DeepSearch header variants ----
ALIAS = {
    # Common fields
    "season": {"season", "year"},
    "team": {"team", "school", "team_name"},
    "team_id": {"team_id", "school_id", "cfbd_team_id", "espn_team_id"},
    "conference": {"conference", "conf", "league"},
    "division": {"division", "div"},
    "games": {"games", "gp", "g"},
    "updated_at": {"updated_at", "last_updated"},

    # Team Offense
    "points_for": {"points_for","pf","points_scored","pts_for"},
    "yards_offense": {"yards_offense","total_offense","tot_yds_off","off_yds","yards_total_offense"},
    "yards_passing_offense": {"yards_passing_offense","pass_yds_off","pass_yards","passing_yards"},
    "yards_rushing_offense": {"yards_rushing_offense","rush_yds_off","rushing_yards"},
    "first_downs_offense": {"first_downs_offense","first_downs","fd_off"},
    "turnovers_lost": {"turnovers_lost","to_lost","giveaways"},

    # Team Defense
    "points_against": {"points_against","pa","points_allowed","pts_against"},
    "yards_defense_allowed": {"yards_defense_allowed","total_defense_allowed","def_yds_allowed","yards_allowed"},
    "yards_passing_defense_allowed": {"yards_passing_defense_allowed","pass_yds_allowed","pass_yards_allowed","passing_yards_allowed"},
    "yards_rushing_defense_allowed": {"yards_rushing_defense_allowed","rush_yds_allowed","rushing_yards_allowed"},
    "sacks_defense": {"sacks_defense","sacks","def_sacks"},
    "interceptions_defense": {"interceptions_defense","int_def","def_int"},
    "takeaways": {"takeaways","to_gained","take_aways"},

    # Rates / Situational
    "third_down_offense_pct": {"third_down_offense_pct","third_down_pct","3rd_down_off_pct"},
    "third_down_defense_pct": {"third_down_defense_pct","3rd_down_def_pct"},
    "red_zone_offense_pct": {"red_zone_offense_pct","rzo_pct","rz_off_pct"},
    "red_zone_defense_pct": {"red_zone_defense_pct","rz_def_pct"},
    "time_of_possession_sec": {"time_of_possession_sec","top_sec","time_of_possession","time_poss_sec"},

    # Players: identity
    "player_id": {"player_id","athlete_id","espn_player_id","pid"},
    "player_name": {"player_name","name","athlete"},
    "position": {"position","pos"},
    "class": {"class","class_year","yr"},
    # Players: usage / games
    "player_games": {"games","gp","g"},

    # Passing
    "pass_att": {"pass_att","att_pass","pass_attmpts","att"},
    "pass_cmp": {"pass_cmp","cmp","completions"},
    "pass_yds": {"pass_yds","pass_yards","yds_pass"},
    "pass_td": {"pass_td","td_pass","pass_tds"},
    "pass_int": {"pass_int","int","interceptions"},
    "pass_sacks": {"pass_sacks","sacks_taken","sk_taken"},
    "pass_ypa": {"pass_ypa","ypa"},
    "pass_rating": {"pass_rating","rating","qb_rating"},

    # Rushing
    "rush_att": {"rush_att","att_rush","rushing_att","ra"},
    "rush_yds": {"rush_yds","rush_yards","yds_rush"},
    "rush_td": {"rush_td","td_rush","rush_tds"},
    "rush_ypa": {"rush_ypa","ypru","yds_per_rush","ypc"},

    # Receiving
    "rec_rec": {"rec_rec","receptions","rec"},
    "rec_tgt": {"rec_tgt","targets","tgt"},
    "rec_yds": {"rec_yds","rec_yards","yds_rec"},
    "rec_td": {"rec_td","td_rec","rec_tds"},
    "rec_ypr": {"rec_ypr","yards_per_rec","ypr"},

    # Defense players
    "def_tackles_total": {"def_tackles_total","tackles_total","tk_total"},
    "def_tackles_solo": {"def_tackles_solo","tackles_solo","tk_solo"},
    "def_tfl": {"def_tfl","tfl"},
    "def_sacks": {"def_sacks","sacks","sk"},
    "def_pd": {"def_pd","passes_defended","pd"},
    "def_int": {"def_int","interceptions","int"},
    "def_ff": {"def_ff","forced_fumbles","ff"},
    "def_fr": {"def_fr","fumble_recoveries","fr"},

    # Specialists
    "kick_fgm": {"kick_fgm","fgm"},
    "kick_fga": {"kick_fga","fga"},
    "kick_xpm": {"kick_xpm","xpm"},
    "kick_xpa": {"kick_xpa","xpa"},
    "punt_avg": {"punt_avg","punting_avg","p_avg"},
    "punt_ct": {"punt_ct","punts","p_ct"},
}

TEAM_CANON = [
    "season","team","team_id","conference","division","games",
    "points_for","points_against",
    "yards_offense","yards_passing_offense","yards_rushing_offense","first_downs_offense","turnovers_lost",
    "yards_defense_allowed","yards_passing_defense_allowed","yards_rushing_defense_allowed",
    "sacks_defense","interceptions_defense","takeaways",
    "third_down_offense_pct","third_down_defense_pct",
    "red_zone_offense_pct","red_zone_defense_pct",
    "time_of_possession_sec",
]

PLAYER_CANON = [
    "season","team","player_id","player_name","position","class","games",
    "pass_att","pass_cmp","pass_yds","pass_td","pass_int","pass_sacks","pass_ypa","pass_rating",
    "rush_att","rush_yds","rush_td","rush_ypa",
    "rec_rec","rec_tgt","rec_yds","rec_td","rec_ypr",
    "def_tackles_total","def_tackles_solo","def_tfl","def_sacks","def_pd","def_int","def_ff","def_fr",
    "kick_fgm","kick_fga","kick_xpm","kick_xpa","punt_avg","punt_ct",
    "team_id",
]

INJ_CANON = [
    "season","week","team","player_id","player_name","position",
    "report_status","practice_status","designation","body_part","description","source","date_updated"
]

def canon_map(in_headers, canon_list):
    m = {}
    lower_in = {h.lower(): h for h in in_headers}
    for canon in canon_list:
        if canon in ALIAS:
            found = None
            for alt in ALIAS[canon]:
                if alt.lower() in lower_in:
                    found = lower_in[alt.lower()]
                    break
            if found:
                m[canon] = found
        else:
            # exact match
            if canon.lower() in lower_in:
                m[canon] = lower_in[canon.lower()]
    return m

def read_rows(path):
    with open(path, newline='', encoding='utf-8-sig') as f:
        rdr = csv.DictReader(f)
        rows = list(rdr)
        return rdr.fieldnames or [], rows

def write_canon(path, headers, rows):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        for r in rows:
            w.writerow(r)

def coerce_num(v):
    if v is None: return ""
    s = str(v).strip()
    if s in {"", "NA", "N/A", "null", "None"}: return ""
    return s

def normalize_teams(src, out_path):
    in_headers, rows = read_rows(src)
    M = canon_map(in_headers, TEAM_CANON)
    out = []
    for r in rows:
        o = {}
        for k in TEAM_CANON:
            src_k = M.get(k)
            val = r.get(src_k, "") if src_k else ""
            o[k] = coerce_num(val)
        # basic cleanups
        o["season"] = coerce_num(o["season"])
        o["team"] = (o["team"] or "").strip()
        o["team_id"] = coerce_num(o["team_id"])
        out.append(o)
    write_canon(out_path, TEAM_CANON, out)

def normalize_players(src, out_path):
    in_headers, rows = read_rows(src)
    M = canon_map(in_headers, PLAYER_CANON)
    out = []
    for r in rows:
        o = {}
        for k in PLAYER_CANON:
            src_k = M.get(k)
            val = r.get(src_k, "") if src_k else ""
            o[k] = coerce_num(val)
        o["season"] = coerce_num(o["season"])
        o["team"] = (o["team"] or "").strip()
        o["player_name"] = (o["player_name"] or "").strip()
        out.append(o)
    write_canon(out_path, PLAYER_CANON, out)

def normalize_injuries(src, out_path):
    in_headers, rows = read_rows(src)
    M = canon_map(in_headers, INJ_CANON)
    out = []
    for r in rows:
        o = {}
        for k in INJ_CANON:
            src_k = M.get(k)
            val = r.get(src_k, "") if src_k else ""
            o[k] = (str(val).strip() if val is not None else "")
        # default source & timestamp if missing
        if not o.get("source"): o["source"] = "deepsearch"
        if not o.get("date_updated"):
            o["date_updated"] = datetime.utcnow().isoformat()
        out.append(o)
    write_canon(out_path, INJ_CANON, out)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--teams", help="DeepSearch teams CSV", required=False)
    ap.add_argument("--players", help="DeepSearch players CSV", required=False)
    ap.add_argument("--injuries", help="DeepSearch injuries CSV", required=False)
    args = ap.parse_args()

    out_teams = "/tmp/ncaaf_teams.csv"
    out_players = "/tmp/ncaaf_players.csv"
    out_inj = "/tmp/ncaaf_injuries.csv"

    if args.teams:
        normalize_teams(args.teams, out_teams)
        print(f"Wrote {out_teams}")
    if args.players:
        normalize_players(args.players, out_players)
        print(f"Wrote {out_players}")
    if args.injuries:
        normalize_injuries(args.injuries, out_inj)
        print(f"Wrote {out_inj}")
