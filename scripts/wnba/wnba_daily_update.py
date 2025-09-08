import os
import sys
from datetime import datetime, timedelta, date
from typing import List, Dict, Any

# Ensure repo root on path
if os.getenv("PYTHONPATH") is None or os.getcwd() not in (os.getenv("PYTHONPATH") or ""):
    sys.path.insert(0, os.getcwd())

from scripts.wnba.wnba_bulk_backfill import (
    SPORT, PROVIDER, BASE, http_get_with_proxy, parse_schedule_rows,
    parse_schedule_month_urls, upsert_game_and_stats, current_wnba_season_year
)
from scripts.wnba.supabase_client import get_client

def games_for_dates(d0: date, d1: date) -> List[Dict[str, Any]]:
    # Pull current season schedule pages and filter by date range
    season = current_wnba_season_year(d0)
    urls = parse_schedule_month_urls(season)
    games = []
    for u in urls:
        html = http_get_with_proxy(u)
        rows = parse_schedule_rows(html)
        for g in rows:
            gd = datetime.fromisoformat(g["date"]).date()
            if d0 <= gd <= d1:
                games.append(g)
    return games, season

def run():
    client = get_client()
    today = date.today()
    yday = today - timedelta(days=1)
    games, season = games_for_dates(yday, today)
    if not games:
        print(f"No WNBA games between {yday.isoformat()} and {today.isoformat()}. Safe no op.")
        return
    total_t = 0
    total_p = 0
    for g in games:
        try:
            t_ok, p_ok = upsert_game_and_stats(client, season, g)
            total_t += t_ok
            total_p += p_ok
        except Exception as e:
            print(f"WARN daily upsert failed for {g.get('provider_game_id')}: {e}")
    print(f"WNBA daily update complete. games={len(games)} team_rows={total_t} player_rows={total_p}")

if __name__ == "__main__":
    run()
