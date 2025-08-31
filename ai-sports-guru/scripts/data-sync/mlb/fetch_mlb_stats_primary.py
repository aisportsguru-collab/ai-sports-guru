#!/usr/bin/env python3
import os, sys, logging, time, math
import pandas as pd
import numpy as np
import requests

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("mlb-stats")

SEASONS = os.getenv("SEASONS")
if not SEASONS:
    log.error("SEASONS env var not set. Example SEASONS=2023,2024,2025")
    sys.exit(1)
SEASONS = [int(s.strip()) for s in SEASONS.split(",") if s.strip()]

STATSAPI = "https://statsapi.mlb.com/api/v1"

def get_json(url, params=None, tries=3, sleep=0.4):
    for i in range(tries):
        r = requests.get(url, params=params, timeout=30)
        if r.ok:
            return r.json()
        time.sleep(sleep*(i+1))
    r.raise_for_status()

def fetch_active_teams():
    j = get_json(f"{STATSAPI}/teams", {"sportIds": 1, "activeStatus": "Yes"})
    teams = {}
    abbr_to_id = {}
    for t in j.get("teams", []):
        teams[t["id"]] = dict(
            abbr=t.get("abbreviation"),
            name=t.get("name"),
            league=(t.get("league") or {}).get("name"),
            division=(t.get("division") or {}).get("name"),
        )
        if t.get("abbreviation"):
            abbr_to_id[t["abbreviation"]] = t["id"]
    return teams, abbr_to_id

def roster_id_map(season, team_id):
    j = get_json(f"{STATSAPI}/teams/{team_id}/roster", {"season": season})
    out = {}
    for it in j.get("roster", []):
        p = it.get("person", {})
        out[(p.get("fullName","") or "").strip()] = p.get("id")
    return out

def league_standings(season):
    j = get_json(f"{STATSAPI}/standings", {"season": season, "leagueId": "103,104"})
    out = {}
    for rec in j.get("records", []):
        for t in rec.get("teamRecords", []):
            tid = (t.get("team") or {}).get("id")
            out[tid] = dict(wins=t.get("wins"), losses=t.get("losses"), games=t.get("gamesPlayed"))
    return out

def safe_div(a, b):
    try:
        return float(a) / float(b) if b and float(b) != 0 else np.nan
    except Exception:
        return np.nan

def prefer_last_non_tot(series):
    vals = [v for v in series.tolist() if pd.notna(v) and str(v).upper() != 'TOT']
    return vals[-1] if vals else (series.dropna().tolist()[-1] if series.dropna().size else None)

teams_map, abbr_to_id = fetch_active_teams()

from pybaseball import batting_stats, pitching_stats

players_rows, teams_rows = [], []

for season in SEASONS:
    log.info(f"Season {season} fetch start")

    # name -> id map via rosters
    name_to_id = {}
    for team_id in teams_map.keys():
        try:
            name_to_id.update(roster_id_map(season, team_id))
            time.sleep(0.12)
        except Exception:
            continue

    # ---------------- Batting ----------------
    try:
        dfb = batting_stats(season, season, qual=0)  # ALL players
    except TypeError:
        dfb = batting_stats(season, season)
    dfb.columns = [c.lower() for c in dfb.columns]
    dfb = dfb.rename(columns={
        'name':'player_name','team':'team_abbr','pa':'pa','ab':'ab','r':'r','h':'h',
        '2b':'double','3b':'triple','hr':'hr','rbi':'rbi','bb':'bb','ibb':'ibb','so':'so',
        'hbp':'hbp','sb':'sb','cs':'cs','ba':'avg','avg':'avg','obp':'obp','slg':'slg','ops':'ops','sf':'sf'
    })
    for c in ['avg','obp','slg','ops','sf']:
        if c not in dfb.columns: dfb[c] = np.nan

    # ---------------- Pitching ----------------
    try:
        dfp = pitching_stats(season, season, qual=0)  # ALL players
    except TypeError:
        dfp = pitching_stats(season, season)
    dfp.columns = [c.lower() for c in dfp.columns]
    dfp = dfp.rename(columns={
        'name':'player_name','team':'team_abbr',
        'h':'h_allowed','er':'er','hr':'hr_allowed','bb':'bb_allowed',
        'so':'so_pitch','ip':'ip','era':'era','whip':'whip'
    })
    bf_src = next((c for c in ['bf','tbf','batters_faced'] if c in dfp.columns), None)
    if bf_src is not None:
        dfp['bf'] = pd.to_numeric(dfp[bf_src], errors='coerce')
    else:
        dfp['bf'] = np.nan

    if 'whip' not in dfp.columns:
        dfp['whip'] = (dfp['bb_allowed'] + dfp['h_allowed']) / pd.to_numeric(dfp.get('ip'), errors='coerce').replace(0, np.nan)

    # ---------------- Merge ----------------
    df = pd.merge(dfb, dfp, on=['player_name','team_abbr'], how='outer', suffixes=('','_pit'))

    # Attach ids/season
    df['player_id'] = df['player_name'].map(name_to_id)
    df['season'] = season
    df['last_known_team_abbr'] = df['team_abbr']

    # Build group key: prefer player_id, fall back to name
    df['group_key'] = df['player_id'].astype('Int64').astype('string')
    df.loc[df['group_key'] == '<NA>', 'group_key'] = 'name:' + df['player_name'].fillna('unknown')

    # ---- Aggregate across teams per player-season ----
    count_cols = ['pa','ab','r','h','double','triple','hr','rbi','bb','ibb','so','hbp','sb','cs',
                  'bf','h_allowed','er','bb_allowed','so_pitch','hr_allowed',
                  'chances','putouts','assists','errors']
    for c in count_cols:
        if c not in df.columns: df[c] = np.nan

    if 'ip' not in df.columns: df['ip'] = np.nan
    if 'sf' not in df.columns: df['sf'] = 0

    def agg_one(g: pd.DataFrame):
        out = {}
        out['season'] = season
        # identity
        pid = pd.to_numeric(g['player_id'], errors='coerce').dropna()
        out['player_id'] = int(pid.iloc[-1]) if not pid.empty else None
        out['player_name'] = g['player_name'].dropna().iloc[-1] if g['player_name'].notna().any() else None
        # last known team (prefer last non-TOT)
        abbr = prefer_last_non_tot(g['last_known_team_abbr'])
        out['last_known_team_abbr'] = abbr
        out['last_known_team_id'] = abbr_to_id.get(abbr) if abbr else None

        # simple attrs
        out['primary_pos'] = None
        out['age'] = None
        out['bats'] = None
        out['throws'] = None

        # sums
        for c in count_cols:
            out[c] = pd.to_numeric(g[c], errors='coerce').sum(min_count=1)

        # innings pitched sum (pybaseball returns decimal innings; summing OK)
        out['ip'] = pd.to_numeric(g['ip'], errors='coerce').sum(min_count=1)

        # batting rates
        ab = out['ab']; h = out['h']; bb = out['bb']; hbp = out['hbp']; hr = out['hr']; so = out['so']; sf = (pd.to_numeric(g['sf'], errors='coerce').sum(min_count=1) or 0)
        out['avg'] = safe_div(h, ab)
        out['obp'] = safe_div((h or 0) + (bb or 0) + (hbp or 0), (ab or 0) + (bb or 0) + (hbp or 0) + sf)
        singles = (h or 0) - (out['double'] or 0) - (out['triple'] or 0) - (hr or 0)
        tb = (singles or 0) + 2*(out['double'] or 0) + 3*(out['triple'] or 0) + 4*(hr or 0)
        out['slg'] = safe_div(tb, ab)
        out['ops'] = (out['obp'] + out['slg']) if (pd.notna(out['obp']) and pd.notna(out['slg'])) else np.nan
        out['iso'] = (out['slg'] - out['avg']) if (pd.notna(out['slg']) and pd.notna(out['avg'])) else np.nan
        denom_babip = (ab or 0) - (so or 0) - (hr or 0) + sf
        out['babip'] = safe_div((h or 0) - (hr or 0), denom_babip)

        # advanced batting placeholders
        out['woba'] = None
        out['wrc_plus'] = None

        # pitching rates
        bf = out['bf']
        out['era']   = safe_div((out['er'] or 0)*9.0, out['ip'])
        out['whip']  = safe_div((out['bb_allowed'] or 0) + (out['h_allowed'] or 0), out['ip'])
        out['k_pct'] = safe_div(out['so_pitch'], bf)
        out['bb_pct']= safe_div(out['bb_allowed'], bf)
        out['k_bb_pct'] = (out['k_pct'] - out['bb_pct']) if (pd.notna(out['k_pct']) and pd.notna(out['bb_pct'])) else np.nan
        out['fip'] = None; out['xfip'] = None; out['gb_pct'] = None; out['fb_pct'] = None; out['hr_fb_pct'] = None

        # fielding
        out['innings_field'] = None
        out['drs'] = None; out['uzr'] = None

        out['source'] = 'statsapi+pybaseball'
        return pd.Series(out)

    grouped = df.groupby('group_key', sort=False).apply(agg_one).reset_index(drop=True)

    # enforce column order
    players_cols = [
        "season","player_id","player_name","last_known_team_id","last_known_team_abbr","primary_pos","age","bats","throws",
        "pa","ab","r","h","double","triple","hr","rbi","bb","ibb","so","hbp","sb","cs",
        "avg","obp","slg","ops","iso","babip","woba","wrc_plus",
        "ip","bf","h_allowed","er","bb_allowed","so_pitch","hr_allowed",
        "era","fip","xfip","whip","k_pct","bb_pct","k_bb_pct","gb_pct","fb_pct","hr_fb_pct",
        "innings_field","chances","putouts","assists","errors","drs","uzr",
        "source"
    ]
    for c in players_cols:
        if c not in grouped.columns: grouped[c] = pd.NA

    players_rows.append(grouped[players_cols])

    # ---------------- Team aggregates (simple) ----------------
    wl = league_standings(season)
    rows = []
    # Rebuild per-team from the original df (player x team rows)
    tmp = df.copy()
    tmp['last_known_team_id'] = tmp['last_known_team_abbr'].map(abbr_to_id)
    for team_id, meta in teams_map.items():
        sub = tmp[tmp['last_known_team_id'] == team_id]
        if sub.empty:
            continue
        ab = pd.to_numeric(sub['ab'], errors='coerce').sum(min_count=1)
        h = pd.to_numeric(sub['h'], errors='coerce').sum(min_count=1)
        bb = pd.to_numeric(sub['bb'], errors='coerce').sum(min_count=1)
        hbp = pd.to_numeric(sub['hbp'], errors='coerce').sum(min_count=1)
        sf = 0
        team_avg = safe_div(h, ab)
        team_obp = safe_div((h or 0) + (bb or 0) + (hbp or 0), (ab or 0) + (bb or 0) + (hbp or 0) + sf)
        singles = (h or 0) - (pd.to_numeric(sub['double'], errors='coerce').sum(min_count=1) or 0) - (pd.to_numeric(sub['triple'], errors='coerce').sum(min_count=1) or 0) - (pd.to_numeric(sub['hr'], errors='coerce').sum(min_count=1) or 0)
        tb = (singles or 0) + 2*(pd.to_numeric(sub['double'], errors='coerce').sum(min_count=1) or 0) + 3*(pd.to_numeric(sub['triple'], errors='coerce').sum(min_count=1) or 0) + 4*(pd.to_numeric(sub['hr'], errors='coerce').sum(min_count=1) or 0)
        team_slg = safe_div(tb, ab)
        team_ops = team_obp + team_slg if (pd.notna(team_obp) and pd.notna(team_slg)) else np.nan
        total_ip = pd.to_numeric(sub['ip'], errors='coerce').sum(min_count=1)
        total_er = pd.to_numeric(sub['er'], errors='coerce').sum(min_count=1)
        team_era = safe_div(total_er*9.0, total_ip)
        team_whip = safe_div((pd.to_numeric(sub['bb_allowed'], errors='coerce').sum(min_count=1) or 0) + (pd.to_numeric(sub['h_allowed'], errors='coerce').sum(min_count=1) or 0), total_ip)

        rows.append(dict(
            season=season, team_id=team_id, team_abbr=meta['abbr'], team_name=meta['name'],
            league=meta['league'], division=meta['division'],
            games=(wl.get(team_id, {}).get('games')), wins=(wl.get(team_id, {}).get('wins')), losses=(wl.get(team_id, {}).get('losses')),
            runs_scored=pd.to_numeric(sub['r'], errors='coerce').sum(min_count=1),
            runs_allowed=None, run_diff=None,
            team_avg=team_avg, team_obp=team_obp, team_slg=team_slg, team_ops=team_ops,
            team_era=team_era, team_fip=None, team_whip=team_whip,
            team_woba=None, team_wrc_plus=None,
            source='statsapi+pybaseball'
        ))
    if rows:
        teams_rows.append(pd.DataFrame(rows))

# Write CSVs
if players_rows:
    players = pd.concat(players_rows, ignore_index=True)

    # downcast / types
    for c in ['pa','ab','r','h','double','triple','hr','rbi','bb','ibb','so','hbp','sb','cs','bf','h_allowed','er','bb_allowed','so_pitch','hr_allowed','chances','putouts','assists','errors']:
        if c in players.columns:
            players[c] = pd.to_numeric(players[c], errors='coerce').astype('Int64')
    players['player_id'] = pd.to_numeric(players['player_id'], errors='coerce').astype('Int64')
    players['last_known_team_id'] = pd.to_numeric(players['last_known_team_id'], errors='coerce').astype('Int64')

    players.to_csv("mlb_players.csv", index=False)
    log.info(f"Wrote mlb_players.csv rows {len(players)}")

if teams_rows:
    teams_df = pd.concat(teams_rows, ignore_index=True)
    for c in ['games','wins','losses','runs_scored','runs_allowed','run_diff','team_id']:
        if c in teams_df.columns:
            teams_df[c] = pd.to_numeric(teams_df[c], errors='coerce').astype('Int64')
    teams_df.to_csv("mlb_teams.csv", index=False)
    log.info(f"Wrote mlb_teams.csv rows {len(teams_df)}")
