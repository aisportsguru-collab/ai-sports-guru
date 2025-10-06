/* Usage: node scripts/ingest/games.mjs <league> <days> */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ODDS_API_KEY = process.env.ODDS_API_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Missing Supabase env"); process.exit(1); }
if (!ODDS_API_KEY) { console.error("Missing ODDS_API_KEY"); process.exit(0); }

const league = process.argv[2] || "nba";
const days = String(process.argv[3] || "7");
const MAP = { nba:"basketball_nba", nhl:"icehockey_nhl", mlb:"baseball_mlb", nfl:"americanfootball_nfl", ncaaf:"americanfootball_ncaaf" };
const sportKey = MAP[league]; if (!sportKey) { console.error("Unknown league", league); process.exit(1); }

const api = `https://api.the-odds-api.com/v4/sports/${sportKey}/events?daysFrom=${encodeURIComponent(days)}&dateFormat=unix&all=true&apiKey=${encodeURIComponent(ODDS_API_KEY)}`;
const toISO = s => new Date(s*1000).toISOString();

async function upsert(rows){
  const r = await fetch(`${SUPABASE_URL.replace(/\/$/,"")}/rest/v1/games`, {
    method:"POST",
    headers:{ apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, "Content-Type":"application/json", Prefer:"resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows)
  });
  if (!r.ok){ throw new Error(`supabase ${r.status} ${await r.text()}`); }
}

const res = await fetch(api);
if(!res.ok){ console.error("Odds API error", res.status, await res.text()); process.exit(1); }
const events = await res.json();
const rows = [];
for (const ev of events||[]){
  const id = String(ev.id), st = ev.commence_time ? toISO(ev.commence_time) : null;
  if (!id || !st || !ev.home_team || !ev.away_team) continue;
  rows.push({ game_id:id, sport:league, start_time:st, home_team:ev.home_team, away_team:ev.away_team, status:"scheduled" });
}
if (rows.length){ await upsert(rows); console.log(`Upserted ${rows.length} ${league} games`); } else { console.log("No events"); }
