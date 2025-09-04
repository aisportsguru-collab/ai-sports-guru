import { config } from "dotenv";
config({ path: ".env.local", override: true }); config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

async function getGameIds(league) {
  let from = 0, all = [];
  for (;;) {
    const r = await sb.from("games")
      .select("game_id, provider_game_id", { count: "exact" })
      .eq("sport", league)
      .range(from, from + 999);
    if (r.error) throw r.error;
    all.push(...(r.data || []));
    if (!r.data || r.data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function countOddsForGameIds(gameIds) {
  let total = 0;
  // chunk .in() calls
  const chunk = 500;
  for (let i = 0; i < gameIds.length; i += chunk) {
    const ids = gameIds.slice(i, i + chunk);
    const r = await sb.from("odds").select("id", { count: "exact", head: true }).in("game_id", ids);
    if (r.error && r.error.code !== "PGRST103") throw r.error;
    total += r.count || 0;
  }
  return total;
}

async function run(league) {
  const games = await getGameIds(league);
  const gameIds = games.map(g => g.game_id).filter(Boolean);
  const joined = await countOddsForGameIds(gameIds);
  // rough total odds rows (regardless of join)
  const tot = (await sb.from("odds").select("id", { count: "exact", head: true })).count || 0;

  console.log(JSON.stringify({
    league,
    games: gameIds.length,
    odds_joined_to_games: joined,
    total_odds_rows: tot
  }, null, 2));
}

await run("mlb");
await run("ncaaf");
