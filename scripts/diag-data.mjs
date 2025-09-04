import { config } from "dotenv";
config({ path: ".env.local", override: true }); config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing Supabase env"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

async function counts(league){
  // games in next 14 days
  const now = new Date();
  const end = new Date(now); end.setUTCDate(end.getUTCDate()+14);
  const g = await sb.from("games")
    .select("game_id")
    .eq("sport", league)
    .gte("commence_time", now.toISOString())
    .lte("commence_time", end.toISOString());
  const ids = (g.data||[]).map(x=>x.game_id);
  if (!ids.length) return { league, games: 0 };

  const o = await sb.from("odds")
    .select("game_id, moneyline_home, moneyline_away, spread_line, spread_home, spread_away, total_points, over_odds, under_odds, updated_at")
    .in("game_id", ids);
  const odds = o.data||[];

  const latest = {};
  for (const row of odds.sort((a,b)=>new Date(a.updated_at)-new Date(b.updated_at))) {
    latest[row.game_id] = row; // newest wins
  }

  const vals = Object.values(latest);
  const has = (k)=>vals.filter(v=>v[k]!=null).length;

  // predictions?
  const p = await sb.from("predictions").select("game_id").in("game_id", ids);
  const pset = new Set((p.data||[]).map(x=>x.game_id));

  return {
    league,
    games: ids.length,
    odds_rows: odds.length,
    latest_rows: vals.length,
    fields: {
      moneyline_home: has("moneyline_home"),
      moneyline_away: has("moneyline_away"),
      spread_line:    has("spread_line"),
      total_points:   has("total_points"),
    },
    predictions: pset.size
  };
}

const leagues = ["nfl","mlb","nba","ncaaf","ncaab","wnba","nhl"];
const run = async ()=> {
  for (const lg of leagues) {
    const r = await counts(lg);
    console.log(r);
  }
};
run().catch(e=>{ console.error(e); process.exit(1); });
