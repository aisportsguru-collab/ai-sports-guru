#!/usr/bin/env node
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import fetch from "node-fetch";
import pg from "pg";

const INPUT_SPORTS = (process.argv[2] || "nfl,mlb,nba,nhl,ncaaf").split(",").map(s => s.trim());
const SPORT_MAP = {
  nfl:   "americanfootball_nfl",
  ncaaf: "americanfootball_ncaaf",
  nba:   "basketball_nba",
  mlb:   "baseball_mlb",
  nhl:   "icehockey_nhl",
};

const API     = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
const REGION  = process.env.ODDS_API_REGION || "us";
const MARKETS = process.env.ODDS_API_MARKETS || "h2h,spreads,totals";
const SUPA    = process.env.SUPABASE_DB_URL;

if (!API)  { console.error("Missing ODDS_API_KEY or NEXT_PUBLIC_THE_ODDS_API_KEY"); process.exit(1); }
if (!SUPA) { console.error("Missing SUPABASE_DB_URL"); process.exit(1); }

const pool = new pg.Pool({ connectionString: SUPA, ssl: { rejectUnauthorized: false } });

function americanFromDecimal(dec) {
  if (dec == null) return null;
  if (dec >= 2) return Math.round((dec - 1) * 100);
  return Math.round(-100 / (dec - 1));
}
function norm(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function fuzzyPick(outcomes, home, away) {
  let oHome = outcomes.find(o => norm(o.name) === norm(home));
  let oAway = outcomes.find(o => norm(o.name) === norm(away));
  if (!oHome) oHome = outcomes.find(o => norm(home).includes(norm(o.name)) || norm(o.name).includes(norm(home)));
  if (!oAway) oAway = outcomes.find(o => norm(away).includes(norm(o.name)) || norm(o.name).includes(norm(away)));
  if (!oHome || !oAway) {
    const [a,b] = outcomes;
    if (!oHome && a) oHome = a;
    if (!oAway && b) oAway = b || a;
  }
  return { oHome, oAway };
}

async function findLocalGameId({ sport, home, away, commence }) {
  const sql = `
    select id as game_id
    from games
    where lower(home_team) = lower($1)
      and lower(away_team) = lower($2)
      and sport = $3
      and start_time between ($4::timestamptz - interval '12 hours') and ($4::timestamptz + interval '12 hours')
    order by abs(extract(epoch from (start_time - $4::timestamptz))) asc
    limit 1`;
  const res = await pool.query(sql, [home, away, sport, new Date(commence).toISOString()]);
  return res.rows?.[0]?.game_id || null;
}

async function upsertOdds(row) {
  const q = `
  insert into odds
  (game_id, sportsbook, market,
   price_home, price_away,
   spread_line, spread_price_home, spread_price_away,
   total_line, total_over_price, total_under_price,
   ml_price_home, ml_price_away,
   fetched_at)
  values
  ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
  on conflict (game_id, sportsbook, market)
  do update set
    price_home = excluded.price_home,
    price_away = excluded.price_away,
    spread_line = excluded.spread_line,
    spread_price_home = excluded.spread_price_home,
    spread_price_away = excluded.spread_price_away,
    total_line = excluded.total_line,
    total_over_price = excluded.total_over_price,
    total_under_price = excluded.total_under_price,
    ml_price_home = excluded.ml_price_home,
    ml_price_away = excluded.ml_price_away,
    fetched_at = now()
  `;
  await pool.query(q, [
    row.game_id, row.sportsbook, row.market,
    row.ml_home, row.ml_away,
    row.spread_line, row.spread_home, row.spread_away,
    row.total_line, row.total_over, row.total_under,
    row.ml_home, row.ml_away
  ]);
}

async function runOne(sportKey) {
  const oddsSport = SPORT_MAP[sportKey];
  if (!oddsSport) { console.error(`Unknown local sport alias: ${sportKey}`); return; }
  const url = `https://api.the-odds-api.com/v4/sports/${oddsSport}/odds?regions=${REGION}&markets=${MARKETS}&oddsFormat=decimal&apiKey=${API}`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`Fetch failed for ${sportKey}`, await res.text()); return; }
  const games = await res.json();

  for (const g of games) {
    const home = g.home_team, away = g.away_team, commence_time = g.commence_time;
    const game_id = await findLocalGameId({ sport: sportKey, home, away, commence: commence_time });
    if (!game_id) continue;

    for (const bk of g.bookmakers || []) {
      const sportsbook = bk.key;
      const h2h     = (bk.markets || []).find(m => m.key === "h2h");
      const spreads = (bk.markets || []).find(m => m.key === "spreads");
      const totals  = (bk.markets || []).find(m => m.key === "totals");

      let ml_home = null, ml_away = null;
      if (h2h?.outcomes?.length >= 2) {
        const { oHome, oAway } = fuzzyPick(h2h.outcomes, home, away);
        ml_home = americanFromDecimal(oHome?.price);
        ml_away = americanFromDecimal(oAway?.price);
      }

      let spread_line = null, spread_home = null, spread_away = null;
      if (spreads?.outcomes?.length >= 2) {
        const { oHome, oAway } = fuzzyPick(spreads.outcomes, home, away);
        spread_line = oHome?.point ?? (oAway?.point != null ? -oAway.point : null);
        spread_home = americanFromDecimal(oHome?.price);
        spread_away = americanFromDecimal(oAway?.price);
      }

      let total_line = null, total_over = null, total_under = null;
      if (totals?.outcomes?.length >= 2) {
        const oOver  = totals.outcomes.find(o => /over/i.test(o.name || "")) || totals.outcomes[0];
        const oUnder = totals.outcomes.find(o => /under/i.test(o.name || "")) || totals.outcomes[1] || totals.outcomes[0];
        total_line  = oOver?.point ?? oUnder?.point ?? null;
        total_over  = americanFromDecimal(oOver?.price);
        total_under = americanFromDecimal(oUnder?.price);
      }

      await upsertOdds({
        game_id, sportsbook, market: "main",
        ml_home, ml_away,
        spread_line, spread_home, spread_away,
        total_line, total_over, total_under
      });
    }
  }
}

async function main() {
  const ping = await pool.query("select now() as now");
  console.log("db_ok=", ping.rows[0].now);
  for (const s of INPUT_SPORTS) await runOne(s);
  await pool.end();
  console.log("Done");
}
main().catch(e => { console.error(e); process.exit(1); });
