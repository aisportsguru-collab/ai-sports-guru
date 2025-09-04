/**
 * Node script: pulls odds from Odds API and upserts into Supabase.
 * Run:  npx tsx scripts/fetch-odds.ts nfl,mlb,ncaaf
 */
import "dotenv/config";
import fetch from "node-fetch";
import { supabaseAdmin } from "../lib/db/server.js";

const SUPPORTED = new Set(["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"]);
const ODDS_API_KEY = process.env.ODDS_API_KEY!;
const BOOK = (process.env.ODDS_BOOK || "betmgm").toLowerCase();

function normLeague(s: string){ return s.toLowerCase(); }

async function main() {
  const leaguesArg = (process.argv[2] || "nfl,mlb,ncaaf").split(",").map(normLeague).filter(l => SUPPORTED.has(l));
  const sb = supabaseAdmin();

  for (const league of leaguesArg) {
    // NOTE: replace URL with the Odds API endpoint you use (schedule+odds combined is ideal).
    const url = `https://api.the-odds-api.com/v4/sports/${league}/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american&bookmakers=${BOOK}&apiKey=${ODDS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Odds API error", league, res.status, await res.text());
      continue;
    }
    const rows: any[] = await res.json();

    for (const r of rows) {
      // You may need to map fields depending on your Odds API response structure.
      const game_id = r.id;
      const game_time = r.commence_time ? new Date(r.commence_time).toISOString() : null;
      const away_team = r.away_team;
      const home_team = r.home_team;

      // Upsert game
      await sb.from("games").upsert({
        league, game_id, game_time, away_team, home_team, updated_at: new Date().toISOString()
      }, { onConflict: "game_id" });

      // Extract odds at selected book
      const bm = (r.bookmakers || []).find((b: any) => b.key?.toLowerCase() === BOOK);
      let moneyline_away: number|undefined, moneyline_home: number|undefined;
      let spread_away: number|undefined, spread_home: number|undefined;
      let total_points: number|undefined;

      for (const market of (bm?.markets || [])) {
        if (market.key === "h2h") {
          for (const o of market.outcomes) {
            if (o.name === away_team) moneyline_away = o.price;
            if (o.name === home_team) moneyline_home = o.price;
          }
        }
        if (market.key === "spreads") {
          for (const o of market.outcomes) {
            if (o.name === away_team) spread_away = o.point;
            if (o.name === home_team) spread_home = o.point;
          }
        }
        if (market.key === "totals") {
          // choose "Over" outcome for point; both carry same point normally
          const over = market.outcomes.find((o: any) => o.name?.toLowerCase() === "over");
          if (over?.point != null) total_points = over.point;
        }
      }

      await sb.from("odds").upsert({
        game_id,
        sportsbook: BOOK,
        moneyline_away,
        moneyline_home,
        spread_away,
        spread_home,
        total_points,
        updated_at: new Date().toISOString()
      }, { onConflict: "game_id,sportsbook" });
    }
    console.log(`Ingested ${rows.length} ${league} rows`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
