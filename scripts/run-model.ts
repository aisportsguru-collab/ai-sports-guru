import "dotenv/config";
import { supabaseAdmin } from "../lib/db/server.js";

function softmax2(a: number, b: number) {
  const ea = Math.exp(a), eb = Math.exp(b);
  const sum = ea + eb;
  return [ea/sum, eb/sum];
}

async function main() {
  const sb = supabaseAdmin();

  // Get upcoming games with odds
  const { data: games } = await sb
    .from("games")
    .select("game_id, league, game_time, away_team, home_team, odds:odds(*)")
    .gte("game_time", new Date(Date.now()-60*60*1000).toISOString())
    .order("game_time");

  if (!games?.length) { console.log("No games to predict"); return; }

  for (const g of games) {
    const o = Array.isArray(g.odds) ? g.odds[0] : null;
    if (!o) continue;

    // Moneyline pick: lower (absolute) minus price is favored; confidence from price gap
    const mlAway = o.moneyline_away ?? 0;
    const mlHome = o.moneyline_home ?? 0;
    const [pAway, pHome] = softmax2(-Math.abs(mlAway), -Math.abs(mlHome));
    const mlPick = pAway > pHome ? g.away_team : g.home_team;
    const mlConf = Math.max(pAway, pHome); // 0.5..~0.8 for typical prices

    await sb.from('predictions').upsert({
      game_id: g.game_id,
      model_version: "v1",
      pick_type: "moneyline",
      pick_side: mlPick,
      confidence: mlConf,
      updated_at: new Date().toISOString()
    })

    // Spread pick: lean to the team with more favorable spread magnitude
    const spreadAway = Number(o.spread_away ?? 0);
    const spreadHome = Number(o.spread_home ?? 0);
    const spreadPick = Math.abs(spreadAway) > Math.abs(spreadHome) ? g.away_team : g.home_team;
    const spreadConf = 0.5 + Math.min(0.45, Math.abs(spreadAway - spreadHome) * 0.05);

    await sb.from('predictions').upsert({
      game_id: g.game_id,
      model_version: "v1",
      pick_type: "spread",
      pick_side: spreadPick,
      pick_value: Math.abs(spreadAway) > Math.abs(spreadHome) ? spreadAway : spreadHome,
      confidence: spreadConf,
      updated_at: new Date().toISOString()
    })

    // Total pick: heuristic around 44/220 lines; make a call with medium confidence
    const total = Number(o.total_points ?? 0);
    if (total) {
      const target = g.league === "mlb" ? 9 : g.league === "nba" ? 220 : 44;
      const side = total > target ? "under" : "over"; // be contrarian-ish
      const conf = 0.55 + Math.min(0.35, Math.abs(total - target) * 0.01);
      await sb.from('predictions').upsert({
        game_id: g.game_id,
        model_version: "v1",
        pick_type: "total",
        pick_side: side,
        pick_value: total,
        confidence: conf,
        updated_at: new Date().toISOString()
      })
    }
  }

  console.log("Predictions upserted");
}

main().catch(e => { console.error(e); process.exit(1); });
