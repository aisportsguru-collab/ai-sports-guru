#!/usr/bin/env python3
import os, sys, logging, datetime, time
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
    wlg = {}
    for rec in j.get("records", []):
        for t in rec.get("teamRecords", []):
            team = t.get("team", {})
            team_id = team.get("id")
            wlg[team_id] = dict(
                wins=t.get("wins"),
                losses=t.get("losses"),
                games=t.get("gamesPlayed"),
            )
    return wlg

def safe_div(a, b):
    try:
        return float(a) / float(b) if b and float(b) != 0 else np.nan
    except Exception:
        return np.nan

teams_map, abbr_to_id = fetch_active_teams()

from pybaseball import batting_stats, pitching_stats

players_rows = []
teams_rows = []

for season in SEASONS:
    log.info(f"Season {season} fetch start")

    # Build player name -> id map
    name_to_id = {}
    for team_id in teams_map.keys():
        try:
            name_to_id.update(roster_id_map(season, team_id))
            time.sleep(0.12)
        except Exception:
            continue

    # ------- Batting -------
    dfb = batting_stats(season, season)
    # normalize to lowercase columns so renames are stable
    dfb.columns = [c.lower() for c in dfb.columns]

    dfb = dfb.rename(columns={
        'name': 'player_name',
        'team': 'team_abbr',
        'pa': 'pa', 'ab': 'ab', 'r': 'r', 'h': 'h',
        '2b': 'double', '3b': 'triple', 'hr': 'hr',
        'rbi': 'rbi', 'bb': 'bb', 'ibb': 'ibb', 'so': 'so',
        'hbp': 'hbp', 'sb': 'sb', 'cs': 'cs',
        # batting rate stats (handle ba/avg variants)
        'ba': 'avg', 'avg': 'avg',
        'obp': 'obp', 'slg': 'slg', 'ops': 'ops',
        'sf': 'sf'
    })

    # ensure optional columns exist
    for c in ['avg','obp','slg','ops','sf']:
        if c not in dfb.columns:
            dfb[c] = np.nan

    # ISO = SLG - AVG if both present
    dfb['iso'] = (dfb['slg'] - dfb['avg']) if ('slg' in dfb and 'avg' in dfb) else np.nan

    # BABIP = (H - HR) / (AB - SO - HR + SF)
    denom = (dfb['ab'] - dfb['so'] - dfb['hr'] + dfb['sf']).replace(0, np.nan)
    dfb['babip'] = (dfb['h'] - dfb['hr']) / denom

    dfb['woba'] = pd.NA
    dfb['wrc_plus'] = pd.NA

    # ------- Pitching -------
    dfp = pitching_stats(season, season)
    dfp.columns = [c.lower() for c in dfp.columns]
    dfp = dfp.rename(columns={
        'name': 'player_name',
        'team': 'team_abbr',
        'h': 'h_allowed',
        'er': 'er',
        'hr': 'hr_allowed',
        'bb': 'bb_allowed',
        'so': 'so_pitch',
        'ip': 'ip',
        'bf': 'bf',
        'era': 'era',
        'whip': 'whip'
    })

    if 'whip' not in dfp.columns:
        dfp['whip'] = (dfp['bb_allowed'] + dfp['h_allowed']) / dfp['ip'].replace(0, np.nan)
    dfp['k_pct'] = dfp['so_pitch'] / dfp['bf'].replace(0, np.nan)
    dfp['bb_pct'] = dfp['bb_allowed'] / dfp['bf'].replace(0, np.nan)
    dfp['k_bb_pct'] = dfp['k_pct'] - dfp['bb_pct']
    for c in ['fip','xfip','gb_pct','fb_pct','hr_fb_pct']:
        dfp[c] = pd.NA

    # Merge outer
    df = pd.merge(dfb, dfp, on=['player_name','team_abbr'], how='outer', suffixes=('','_pit'))

    # Last known team + player id
    df['last_known_team_abbr'] = df['team_abbr']
    df['last_known_team_id'] = df['last_known_team_abbr'].map(abbr_to_id)
    df['player_id'] = df['player_name'].map(name_to_id)

    # Nullables
    for c in ['primary_pos','age','bats','throws']:
        df[c] = pd.NA
    for c in ['innings_field','chances','putouts','assists','errors','drs','uzr']:
        if c not in df.columns:
            df[c] = pd.NA

    df['season'] = season
    df['source'] = 'statsapi+pybaseball'

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
        if c not in df.columns:
            df[c] = pd.NA
    players_rows.append(df[players_cols])

    # ------- Team aggregates -------
    wl = league_standings(season)
    team_rows = []
    for team_id, meta in teams_map.items():
        sub = df[df['last_known_team_id'] == team_id]
        if sub.empty:
            continue
        ab = sub['ab'].sum(min_count=1)
        h = sub['h'].sum(min_count=1)
        bb = sub['bb'].sum(min_count=1)
        hbp = sub['hbp'].sum(min_count=1)
        sf = sub['cs'].apply(lambda x: 0).sum() * 0  # placeholder; most seasons SF not in pybaseball rows
        obp_num = (h or 0) + (bb or 0) + (hbp or 0)
        obp_den = (ab or 0) + (bb or 0) + (hbp or 0) + sf
        team_avg = safe_div(h, ab)
        team_obp = safe_div(obp_num, obp_den)
        tb = (h or 0) + (sub['double'].sum(min_count=1) or 0) + 2*(sub['triple'].sum(min_count=1) or 0) + 3*(sub['hr'].sum(min_count=1) or 0)
        team_slg = safe_div(tb, ab)
        team_ops = team_obp + team_slg if not np.isnan(team_obp) and not np.isnan(team_slg) else np.nan
        total_ip = sub['ip'].sum(min_count=1)
        total_er = sub['er'].sum(min_count=1)
        team_era = safe_div(total_er*9.0, total_ip)
        team_whip = safe_div((sub['bb_allowed'].sum(min_count=1) or 0) + (sub['h_allowed'].sum(min_count=1) or 0), total_ip)

        runs_scored = sub['r'].sum(min_count=1)
        team_rows.append(dict(
            season=season, team_id=team_id, team_abbr=meta['abbr'], team_name=meta['name'],
            league=meta['league'], division=meta['division'],
            games=(wl.get(team_id, {}).get('games')), wins=(wl.get(team_id, {}).get('wins')), losses=(wl.get(team_id, {}).get('losses')),
            runs_scored=runs_scored, runs_allowed=None, run_diff=None,
            team_avg=team_avg, team_obp=team_obp, team_slg=team_slg, team_ops=team_ops,
            team_era=team_era, team_fip=None, team_whip=team_whip,
            team_woba=None, team_wrc_plus=None,
            source='statsapi+pybaseball'
        ))
    if team_rows:
        teams_rows.append(pd.DataFrame(team_rows))

# Write CSVs
if players_rows:
    players = pd.concat(players_rows, ignore_index=True)
    for c in ['pa','ab','r','h','double','triple','hr','rbi','bb','ibb','so','hbp','sb','cs','bf','h_allowed','er','bb_allowed','so_pitch','hr_allowed',
              'chances','putouts','assists','errors']:
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
