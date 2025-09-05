#!/usr/bin/env python3
import re, os, json, datetime, requests
from bs4 import BeautifulSoup
from scripts.ncaab.supabase_client import get_client

sb = get_client()

URL = os.getenv("NCAAB_INJURY_URL", "https://www.covers.com/sport/basketball/ncaab/injuries")

def scrape():
    try:
        r = requests.get(URL, timeout=30, headers={"User-Agent":"Mozilla/5.0 AiSportsGuru"})
        r.raise_for_status()
    except Exception as e:
        print(f"[ncaab] injuries: fetch failed: {e}")
        return []

    soup = BeautifulSoup(r.text, "html.parser")
    rows = []
    # Covers changes occasionally; we look for table-ish structures
    # heuristic: rows with team, player, status, description/date
    for tr in soup.select("table tr"):
        tds = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(tds) < 4:
            continue
        team, player, status, note = tds[0:4]
        # date extraction fallback (often included in note)
        m = re.search(r'(\d{4}-\d{2}-\d{2}|\w{3}\s+\d{1,2},\s*\d{4})', note)
        if m:
            try:
                report_date = datetime.datetime.strptime(m.group(1), "%Y-%m-%d").date()
            except Exception:
                try:
                    report_date = datetime.datetime.strptime(m.group(1), "%b %d, %Y").date()
                except Exception:
                    report_date = datetime.date.today()
        else:
            report_date = datetime.date.today()

        rows.append({
            "sport":"NCAAB",
            "team_name": team,
            "player_name": player,
            "status": status,
            "description": note,
            "report_date": str(report_date),
            "raw": {"tds": tds}
        })
    return rows

def upsert(rows):
    if not rows:
        print("[ncaab] injuries: 0 rows parsed (structure may have changed)")
        return
    # emulate upsert by deleting today's duplicates then inserting (since table has no unique)
    today = max(r["report_date"] for r in rows)
    sb.rpc("exec", {"query": f"delete from public.ncaab_injuries where sport='NCAAB' and report_date='{today}'"}).execute() if hasattr(sb, "rpc") else None
    # chunk insert
    chunk=500
    for i in range(0,len(rows),chunk):
        sb.table("ncaab_injuries").insert(rows[i:i+chunk]).execute()
    print(f"[ncaab] injuries: inserted {len(rows)} rows")

if __name__=="__main__":
    try:
        upsert(scrape())
    except Exception as e:
        print(f"[ncaab] injuries: failed {e}")
    print("NCAAB injuries daily complete.")
