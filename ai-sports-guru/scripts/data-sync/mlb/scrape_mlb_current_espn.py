#!/usr/bin/env python3
import logging, datetime, time, requests, pandas as pd
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("espn-fallback")

# This fallback focuses on injuries only, and will not overwrite players or teams if present
# It writes mlb_injuries.csv for the current season date
STATSAPI = "https://statsapi.mlb.com/api/v1"
today = datetime.date.today().isoformat()
year = datetime.date.today().year

teams = requests.get(f"{STATSAPI}/teams", params={"sportIds":1,"activeStatus":"Yes"}).json().get("teams",[])
id_by_name = {t["name"]: t["id"] for t in teams}
abbr_by_name = {t["name"]: t["abbreviation"] for t in teams}

url = "https://www.espn.com/mlb/injuries"
r = requests.get(url, timeout=30, headers={"User-Agent":"Mozilla/5.0"})
r.raise_for_status()
soup = BeautifulSoup(r.text, "html.parser")

records = []
sections = soup.select("div.ContentList__Item")
for sec in sections:
    name_tag = sec.find("a", href=lambda x: x and "/teams/team?" in x)
    if not name_tag:
        continue
    team_name = name_tag.get_text(strip=True)
    team_id = id_by_name.get(team_name)
    team_abbr = abbr_by_name.get(team_name)
    rows = sec.find_all("tr")[1:]
    for row in rows:
        cols = [td.get_text(strip=True) for td in row.find_all("td")]
        if len(cols) < 5:
            continue
        player_name, pos, est_return, status, description = cols[:5]
        designation = status if "IL" in status else None
        il_days = None
        if designation:
            try:
                il_days = int(designation.split("-")[0])
            except:
                pass
        records.append(dict(
            season=year, date_report=today, team_id=team_id, team_abbr=team_abbr,
            player_id=None, player_name=player_name, pos=pos, status=status,
            designation=designation, il_days=il_days, retro_date=None,
            expected_return=est_return or None, description=description, source="espn"
        ))
df = pd.DataFrame(records)
df.to_csv("mlb_injuries.csv", index=False)
log.info(f"Wrote mlb_injuries.csv rows {len(df)} from ESPN")
