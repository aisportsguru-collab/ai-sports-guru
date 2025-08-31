#!/usr/bin/env python3
import sys, pandas as pd
from datetime import datetime
import nfl_data_py as nfl

now = datetime.utcnow()
cur_season = now.year if now.month >= 9 else now.year - 1
SEASONS = [cur_season-2, cur_season-1, cur_season]

def main():
    try:
        df = nfl.import_injuries(SEASONS)
    except Exception as e:
        print(f"[fetch_injuries] nfl_data_py import failed: {e}", file=sys.stderr)
        sys.exit(2)

    want = {
        'season':'season', 'week':'week', 'team':'team', 'player_id':'player_id',
        'player_name':'player_name', 'position':'position',
        'report_status':'report_status', 'practice_status':'practice_status',
        'designation':'designation', 'body_part':'body_part', 'description':'description',
        'updated':'date_updated'
    }
    keep = {}
    for src, dst in want.items():
        keep[dst] = df[src] if src in df.columns else pd.NA

    out = pd.DataFrame(keep)
    for col in ['season','week']:
        out[col] = pd.to_numeric(out[col], errors='coerce').astype('Int64')
    if 'team' in out.columns:
        out['team'] = out['team'].astype('string')

    out.to_csv('nfl_injuries.csv', index=False)
    print(f"Wrote nfl_injuries.csv with {len(out)} rows covering {SEASONS}")
if __name__ == "__main__":
    main()
