#!/usr/bin/env python3
"""
Stub injuries fetcher: writes an empty CSV with correct headers.
Replace later with CFBD or ESPN scraper.
"""
import csv, os, time
from datetime import datetime

out = "/tmp/ncaaf_injuries.csv"
fields = ["season","week","team","player_id","player_name","position",
          "report_status","practice_status","designation","body_part",
          "description","source","date_updated"]

# example: keep this empty unless you want to test a one-line sample
rows = []

os.makedirs("/tmp", exist_ok=True)
with open(out, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    for r in rows:
        if "date_updated" not in r:
            r["date_updated"] = datetime.utcnow().isoformat()+"Z"
        if "source" not in r:
            r["source"] = "stub"
        w.writerow(r)

print(f"Wrote {out} with {len(rows)} rows")
