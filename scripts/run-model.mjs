import { config } from 'dotenv';
config({ path: '.env.local', override: true }); // load .env.local first
config(); // then .env as fallback

import { createClient } from '@supabase/supabase-js';

function makePrediction(game, hasAnyMarket) {
  // TODO: your real model; this is a placeholder to keep the pipe flowing
  return {
    pick: game.home_team ?? null,
    prob: hasAnyMarket ? 0.55 : 0.50,
  };
}

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const SUPABASE_URL = need('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = need('SUPABASE_SERVICE_ROLE_KEY');
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const leagues = (process.argv[2] || 'nfl,mlb,ncaaf')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const RANGE_DAYS = Number(process.env.MODEL_RANGE_DAYS || 14);
const MODEL_NAME = process.env.MODEL_NAME || 'asg_v1';
const MODEL_VERSION = process.env.MODEL_VERSION || 'v1';

async function fetchGamesForLeague(league) {
  const start = new Date();
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + RANGE_DAYS);

  // IMPORTANT: select internal UUID id (for predictions) AND external text game_id (for sanity)
  const { data, error } = await sb
    .from('games')
    .select('game_id, game_id, sport, home_team, away_team, commence_time')
    .ilike('sport', league)
    .gte('commence_time', start.toISOString())
    .lte('commence_time', end.toISOString())
    .order('commence_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function fetchLatestOddsMap(gameIds) {
  if (!gameIds.length) return {};
  const { data, error } = await sb
    .from('v_latest_odds_any')
    .select('game_id, moneyline_home, moneyline_away, spread_line, total_points')
    .in('game_id', gameIds); // v_latest_odds_any uses EXTERNAL text game_id
  if (error) throw error;
  const out = {};
  for (const r of data || []) out[r.game_id] = r;
  return out;
}

async function upsertPredictions(rows) {
  if (!rows.length) return { upserted: 0 };
  // predictions.game_id is UUID; we pass games.id (uuid) below
  const { error } = await sb
    .from('predictions').upsert(rows, { returning: "minimal" }, { onConflict: 'game_id,model_version', returning: 'minimal' })
  if (error) throw error;
  return { upserted: rows.length };
}

async function runForLeague(league) {
  const games = await fetchGamesForLeague(league);

  // Build a lookup for odds using EXTERNAL text ids
  const externalIds = games.map(g => g.game_id).filter(Boolean);
  const oddsByExternalId = await fetchLatestOddsMap(externalIds);

  const payload = [];
  for (const g of games) {
    // Guard: we need the internal UUID id to write predictions
    if (!g.id) continue;

    // Use external text id to check for markets in the odds view
    const odds = g.game_id ? (oddsByExternalId[g.game_id] || {}) : {};
    const hasAnyMarket = [
      odds.moneyline_home, odds.moneyline_away, odds.spread_line, odds.total_points,
    ].some(v => v != null);

    const { pick, prob } = makePrediction(g, hasAnyMarket);

    payload.push({
      game_id: g.game_id, // <-- INTERNAL UUID for predictions
      model: MODEL_NAME,
      model_version: MODEL_VERSION,
      pick,
      prob,
      pick_ml: null,
      conf_ml: null,
      pick_spread: null,
      conf_spread: null,
      pick_total: null,
      conf_total: null,
      features: null,
      updated_at: new Date().toISOString(),
    });
  }

  const { upserted } = await upsertPredictions(payload);
  return { league, games: games.length, upserted };
}

async function main() {
  const results = [];
  for (const lg of leagues) {
    try {
      const r = await runForLeague(lg);
      results.push(r);
      console.log(`[model] ${lg}: games=${r.games} upserted=${r.upserted}`);
    } catch (e) {
      console.error(`[model] ${lg} FAILED`, e);
    }
  }
  const total = results.reduce((s, r) => s + r.upserted, 0);
  console.log(`Predictions upserted total: ${total}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
