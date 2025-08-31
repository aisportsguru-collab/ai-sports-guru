#!/usr/bin/env python3
import logging, datetime, time, requests, pandas as pd

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("injuries-primary")

STATSAPI = "https://statsapi.mlb.com/api/v1"
today = datetime.date.today()
season = today.year
start = datetime.date(season, 3, 1)

teams = requests.get(f"{STATSAPI}/teams", params={"sportIds":1,"activeStatus":"Yes"}).json().get("teams",[])
abbr_by_id = {t["id"]: t["abbreviation"] for t in teams}

rows = []
for t in teams:
    team_id = t["id"]
    params = {"teamId": team_id, "startDate": start.isoformat(), "endDate": today.isoformat()}
    j = requests.get(f"{STATSAPI}/transactions", params=params, timeout=30).json()
    for rec in j.get("transactions", []):
        if rec.get("typeCode") != "SC":
            continue
        player = rec.get("player") or {}
        desc = rec.get("description","")
        status = None
        designation = None
        il_days = None
        low = desc.lower()
        if "injured list" in low or "il" in low:
            status = "IL"
            if "10-day" in low:
                designation, il_days = "10-Day-IL", 10
            elif "15-day" in low:
                designation, il_days = "15-Day-IL", 15
            elif "60-day" in low:
                designation, il_days = "60-Day-IL", 60
        rows.append(dict(
            season=season,
            date_report=(rec.get("effectiveDate","") or "").split("T")[0] or today.isoformat(),
            team_id=(rec.get("toTeam") or {}).get("id") or team_id,
            team_abbr=abbr_by_id.get(team_id),
            player_id=player.get("id"),
            player_name=player.get("fullName"),
            pos=None,
            status=status,
            designation=designation,
            il_days=il_days,
            retro_date=None,
            expected_return=None,
            description=desc,
            source="statsapi"
        ))
        time.sleep(0.05)

df = pd.DataFrame(rows)
df.to_csv("mlb_injuries.csv", index=False)
log.info(f"Wrote mlb_injuries.csv rows {len(df)} from StatsAPI")
