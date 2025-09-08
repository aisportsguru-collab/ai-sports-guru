import os
import sys
from datetime import date

# Ensure repo root on path
if os.getenv("PYTHONPATH") is None or os.getcwd() not in (os.getenv("PYTHONPATH") or ""):
    sys.path.insert(0, os.getcwd())

from scripts.wnba.supabase_client import get_client, upsert_rows

SPORT = "WNBA"

def run():
    # Placeholder no op until a stable free source is selected
    # Keeps workflow green and idempotent during off season or when no source is configured
    print(f"{SPORT} injuries daily runner")
    print("No public free injuries source configured. This is a no op by design.")
    print("Once you pick a source, implement parsing and upsert into public.wnba_injuries with composite key sport, report_date, team_name, player_name.")
    return

if __name__ == "__main__":
    run()
