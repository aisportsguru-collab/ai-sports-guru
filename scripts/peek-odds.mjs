import { config } from "dotenv";
config({ path: ".env.local", override: true }); config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

async function peek(league){
  const g = await sb.from("games").select("game_id, home_team, away_team").eq("sport", league).order("commence_time").limit(5);
  if (g.error) { console.error("[games]", g.error); return; }
  const ids = (g.data||[]).map(x=>x.game_id);
  const o = await sb.from("odds")
    .select("game_id, moneyline_home, moneyline_away, spread_line, total_points, sportsbook, updated_at")
    .in("game_id", ids)
    .order("updated_at", { ascending: false });
  console.log(`=== ${league.toUpperCase()} games sample ===`);
  console.log("games:", g.data);
  console.log("odds:", o.data);
}
await peek("mlb");
await peek("ncaaf");
