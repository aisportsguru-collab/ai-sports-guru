#!/usr/bin/env python3
import os, sys, pandas as pd
from datetime import datetime
import nfl_data_py as nfl

def parse_seasons():
    env = os.getenv("INJURY_SEASONS")
    if env:
        try:
            seasons = sorted(set(int(s.strip()) for s in env.split(",") if s.strip()))
            return seasons
        except Exception as e:
            print(f"[fetch_injuries] Bad INJURY_SEASONS='{env}': {e}", file=sys.stderr)
    now = datetime.utcnow()
    cur = now.year if now.month >= 9 else now.year - 1
    return [cur-2, cur-1, cur]

def main():
    seasons = parse_seasons()
    try:
        df = nfl.import_injuries(seasons)
    except Exception as e:
        print(f"[fetch_injuries] nfl_data_py import failed: {e}", file=sys.stderr)
        sys.exit(2)

    mapping = {
        'season':'season', 'week':'week', 'team':'team', 'player_id':'player_id',
        'player_name':'player_name', 'position':'position',
        'report_status':'report_status', 'practice_status':'practice_status',
        'designation':'designation', 'body_part':'body_part', 'description':'description',
        'updated':'date_updated'
    }
    out = pd.DataFrame({dst: (df[src] if src in df.columns else pd.NA)
                        for src, dst in mapping.items()})

    for col in ['season','week']:
        out[col] = pd.to_numeric(out[col], errors='coerce').astype('Int64')

    out.to_csv('nfl_injuries.csv', index=False)
    print(f"Wrote nfl_injuries.csv with {len(out)} rows covering {seasons}")
if __name__ == "__main__":
    main()
