#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();

const INPUT_SPORTS = (process.argv[2] || "nfl,mlb,nba,nhl,ncaaf")
  .split(",").map(s => s.trim());

const SPORT_MAP = {
  nfl:   "americanfootball_nfl",
  ncaaf: "americanfootball_ncaaf",
  nba:   "basketball_nba",
  mlb:   "baseball_mlb",
  nhl:   "icehockey_nhl",
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const API          = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
const REGION       = process.env.ODDS_API_REGION || "us";
const MARKETS      = process.env.ODDS_API_MARKETS || "h2h,spreads,totals";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE(_KEY)");
  process.exit(1);
}
if (!API) {
  console.error("Missing ODDS_API_KEY or NEXT_PUBLIC_THE_ODDS_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const toAmerican = (dec) => {
  if (dec == null) return null;
  if (dec >= 2) return Math.round((dec - 1) * 100);
  return Math.round(-100 / (dec - 1));
};
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function pickTeams(outcomes, home, away) {
  let oHome = outcomes.find(o => norm(o.name) === norm(home));
  let oAway = outcomes.find(o => norm(o.name) === norm(away));
  if (!oHome) oHome = outcomes.find(o => norm(home).includes(norm(o.name)) || norm(o.name).includes(norm(home)));
  if (!oAway) oAway = outcomes.find(o => norm(away).includes(norm(o.name)) || norm(o.name).includes(norm(away)));
  if (!oHome || !oAway) {
    const [a,b] = outcomes;
    if (!oHome && a) oHome = a;
    if (!oAway) oAway = b || a;
  }
  return { oHome, oAway };
}

async function findLocalGameId({ sport, home, away, commence }) {
  const start = new Date(new Date(commence).getTime() - 12 * 3600 * 1000).toISOString();
  const end   = new Date(new Date(commence).getTime() + 12 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("games")
    .select("game_id,home_team,away_team,start_time,sport")
    .gte("start_time", start)
    .lte("start_time", end);
  if (error) { console.error("games_select_err", error.message); return null; }
  const rows = (data || []);
  const exact = rows.find(r => norm(r.sport) === norm(sport) && norm(r.home_team) === norm(home) && norm(r.away_team) === norm(away));
  const loose = rows.find(r => norm(r.home_team) === norm(home) && norm(r.away_team) === norm(away));
  return (exact || loose)?.game_id || null;
}
const isUuid = (x) => typeof x === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);

async function filterExistingGameIds(rows) {
  const ids = Array.from(new Set(rows.map(r => r.game_id).filter(isUuid)));
  if (!ids.length) return new Set();
  const chunks = []; for (let i=0;i<ids.length;i+=500) chunks.push(ids.slice(i,i+500));
  const exist = new Set();
  for (const c of chunks) {
    const { data, error } = await supabase.from("games").select("game_id").in("game_id", c);
    if (error) { console.error("games_exist_err", error.message); continue; }
    for (const d of (data||[])) exist.add(d.game_id);
  }
  return exist;
}

async function upsertOdds(rows) {
  if (!rows.length) return;
  const exist = await filterExistingGameIds(rows);
  const clean = rows.filter(r => exist.has(r.game_id));
  if (!clean.length) return;
  const chunks = []; for (let i=0;i<clean.length;i+=500) chunks.push(clean.slice(i,i+500));
  for (const c of chunks) {
    const { error } = await supabase
      .from("odds")
      .upsert(c, { onConflict: "game_id,sportsbook" }); // matches odds_game_book_uq
    if (error) console.error("odds_upsert_err", error.message);
  }
}

async function runOne(sportKey) {
  const oddsSport = SPORT_MAP[sportKey];
  if (!oddsSport) { console.error(`Unknown sport alias: ${sportKey}`); return; }

  const url = `https://api.the-odds-api.com/v4/sports/${oddsSport}/odds?regions=${REGION}&markets=${MARKETS}&oddsFormat=decimal&apiKey=${API}`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`Fetch failed for ${sportKey}`, await res.text()); return; }
  const games = await res.json();

  const map = new Map();
  const nowIso = new Date().toISOString();

  for (const g of games) {
    const game_id = await findLocalGameId({ sport: sportKey, home: g.home_team, away: g.away_team, commence: g.commence_time });
    if (!isUuid(game_id)) continue;

    for (const bk of g.bookmakers || []) {
      const sportsbook = bk.key;
      const key = `${game_id}|${sportsbook}`;
      const row = map.get(key) || {
        game_id,
        sportsbook,
        moneyline_home: null,
        moneyline_away: null,
        spread_line: null,
        spread_home: null,
        spread_away: null,
        total_points: null,
        over_odds: null,
        under_odds: null,
        fetched_at: nowIso, // column exists; 'source' defaults to 'theoddsapi'
      };

      const markets = bk.markets || [];
      const h2h     = markets.find(m => m.key === "h2h");
      const spreads = markets.find(m => m.key === "spreads");
      const totals  = markets.find(m => m.key === "totals");

      if (h2h?.outcomes?.length >= 2) {
        const { oHome, oAway } = pickTeams(h2h.outcomes, g.home_team, g.away_team);
        row.moneyline_home = toAmerican(oHome?.price);
        row.moneyline_away = toAmerican(oAway?.price);
      }
      if (spreads?.outcomes?.length >= 2) {
        const { oHome, oAway } = pickTeams(spreads.outcomes, g.home_team, g.away_team);
        row.spread_line = oHome?.point ?? (oAway?.point != null ? -oAway.point : null);
        row.spread_home = toAmerican(oHome?.price);
        row.spread_away = toAmerican(oAway?.price);
      }
      if (totals?.outcomes?.length >= 2) {
        const oOver  = totals.outcomes.find(o => /over/i.test(o.name || "")) || totals.outcomes[0];
        const oUnder = totals.outcomes.find(o => /under/i.test(o.name || "")) || totals.outcomes[1] || totals.outcomes[0];
        row.total_points = oOver?.point ?? oUnder?.point ?? null;
        row.over_odds    = toAmerican(oOver?.price);
        row.under_odds   = toAmerican(oUnder?.price);
      }

      row.fetched_at = nowIso;
      map.set(key, row);
    }
  }

  await upsertOdds(Array.from(map.values()));
}

async function main() {
  const { error: probeErr } = await supabase.from("games").select("game_id").limit(1);
  console.log("db_ok=", probeErr ? "error" : "connected");
  for (const s of INPUT_SPORTS) await runOne(s);
  console.log("Done");
}
main().catch(e => { console.error(e); process.exit(1); });
