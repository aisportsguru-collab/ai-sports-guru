import { config } from "dotenv";
config({ path: ".env.local", override: true });
config();

import { supabaseAdmin } from "../lib/db/node-client.mjs";

async function main() {
  const sb = supabaseAdmin();

  // pick two future games to seed
  const { data: games, error } = await sb
    .from("games")
    .select("game_id, home_team, away_team, game_time")
    .gte("game_time", new Date().toISOString())
    .order("game_time", { ascending: true })
    .limit(2);

  if (error) throw error;
  if (!games?.length) {
    console.log("No upcoming games to seed.");
    return;
  }

  for (const g of games) {
    // pretend public is heavy on home side
    await sb.from("public_bets").upsert(
      [
        { game_id: g.game_id, side: "home", percent: 0.72, source: "seed", updated_at: new Date().toISOString() },
        { game_id: g.game_id, side: "away", percent: 0.28, source: "seed", updated_at: new Date().toISOString() },
      ],
      { onConflict: "game_id,side" }
    );
  }

  console.log(`Seeded public_bets for ${games.length} game(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
