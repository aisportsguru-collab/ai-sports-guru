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

def games_for_dates(d0: date, d1: date) -> (List[Dict[str, Any]], int):
    season = current_wnba_season_year(d0)
    # Try to get the month pages; if that fails, fall back to the main season page
    try:
        urls = parse_schedule_month_urls(season)
        if not urls:
            urls = [f"{BASE}/wnba/years/{season}_games.html"]
    except Exception as e:
        print(f"WARN: could not load schedule-month URLs for {season}: {e}")
        urls = [f"{BASE}/wnba/years/{season}_games.html"]

    games: List[Dict[str, Any]] = []
    failed = 0

    for u in urls:
        try:
            html = http_get_with_proxy(u)
            rows = parse_schedule_rows(html)
        except Exception as e:
            failed += 1
            print(f"WARN: schedule page fetch failed ({u}): {e}")
            continue

        for g in rows:
            try:
                gd = datetime.fromisoformat(g["date"]).date()
            except Exception:
                continue
            if d0 <= gd <= d1:
                games.append(g)

    if not games and failed == len(urls):
        print(f"WARN: all schedule pages failed for season {season}. Likely off-season or temporary block; safe no-op.")
    return games, season

def run():
    client = get_client()
    today = date.today()
    yday = today - timedelta(days=1)

    try:
        games, season = games_for_dates(yday, today)
    except Exception as e:
        # Any unexpected error becomes a safe no-op for daily runs
        print(f"WARN: daily schedule load errored: {e}. Treating as off-season/network block. Safe no-op.")
        return

    if not games:
        print(f"No WNBA games between {yday.isoformat()} and {today.isoformat()}. Safe no-op.")
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
