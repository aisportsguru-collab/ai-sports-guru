#!/usr/bin/env node
import fs from 'fs';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Load .env.local first if present, else .env
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

function need(name, altNames = []) {
  const candidates = [name, ...altNames];
  for (const n of candidates) {
    if (process.env[n] && String(process.env[n]).length > 0) return process.env[n];
  }
  throw new Error(`Missing env ${name}${altNames.length ? ` (or ${altNames.join(' / ')})` : ''}`);
}

const SUPABASE_URL = need('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = need('SUPABASE_SERVICE_ROLE_KEY');
const ODDS_API_KEY = need('ODDS_API_KEY', ['NEXT_PUBLIC_THE_ODDS_API_KEY']);

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const SPORT_KEYS = {
  nfl:  'americanfootball_nfl',
  mlb:  'baseball_mlb',
  ncaaf:'americanfootball_ncaaf',
};

async function fetchOddsEvents(sport) {
  const sportKey = SPORT_KEYS[sport];
  if (!sportKey) throw new Error(`Unsupported sport: ${sport}`);

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
  url.searchParams.set('regions', 'us');
  url.searchParams.set('markets', 'h2h,spreads,totals');
  url.searchParams.set('oddsFormat', 'american');
  url.searchParams.set('dateFormat', 'iso');
  url.searchParams.set('apiKey', ODDS_API_KEY);

  const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`TheOddsAPI ${sport} ${res.status} ${txt}`);
  }
  return await res.json(); // array
}

function avg(a, b) {
  if (a == null || Number.isNaN(a)) return b;
  return (a + b) / 2;
}

function summarizeEvent(ev) {
  let moneyline_home = null;
  let moneyline_away = null;
  let spread_line = null, spread_price_home = null, spread_price_away = null;
  let total_line = null, total_over_price = null, total_under_price = null;

  for (const bm of (ev.bookmakers || [])) {
    for (const m of (bm.markets || [])) {
      if (m.key === 'h2h') {
        const home = m.outcomes.find(o => o.name === ev.home_team);
        const away = m.outcomes.find(o => o.name === ev.away_team);
        if (home?.price != null) moneyline_home = avg(moneyline_home, home.price);
        if (away?.price != null) moneyline_away = avg(moneyline_away, away.price);
      }
      if (m.key === 'spreads') {
        const home = m.outcomes.find(o => o.name === ev.home_team);
        const away = m.outcomes.find(o => o.name === ev.away_team);
        if (home?.point != null) spread_line = avg(spread_line, home.point);
        if (home?.price != null) spread_price_home = avg(spread_price_home, home.price);
        if (away?.price != null) spread_price_away = avg(spread_price_away, away.price);
      }
      if (m.key === 'totals') {
        const over  = m.outcomes.find(o => String(o.name).toLowerCase().startsWith('over'));
        const under = m.outcomes.find(o => String(o.name).toLowerCase().startsWith('under'));
        if (over?.point != null) total_line = avg(total_line, over.point);
        if (over?.price != null) total_over_price = avg(total_over_price, over.price);
        if (under?.price != null) total_under_price = avg(total_under_price, under.price);
      }
    }
  }

  return {
    provider_event_id: ev.id,
    home_team: ev.home_team,
    away_team: ev.away_team,
    commence_time: ev.commence_time,
    moneyline_home,
    moneyline_away,
    spread_line,
    spread_price_home,
    spread_price_away,
    total_line,
    total_over_price,
    total_under_price,
  };
}

async function ensureGameAndGetUuid({ sport, provider_event_id, home_team, away_team, commence_time }) {
  // find by provider_game_id first
  const { data: existing, error: findErr } = await sb
    .from('games')
    .select('id')
    .eq('provider_game_id', provider_event_id)
    .limit(1);
  if (findErr) throw findErr;
  if (existing && existing.length) return existing[0].id;

  // insert minimal games row and return id
  const toInsert = {
    sport,
    league: sport,
    provider_game_id: provider_event_id,
    home_team,
    away_team,
    commence_time: commence_time ? new Date(commence_time).toISOString() : null,
    game_date: commence_time ? new Date(commence_time).toISOString().slice(0,10) : null,
    season: commence_time ? new Date(commence_time).getUTCFullYear() : null,
  };

  const { data: ins, error: insErr } = await sb
    .from('games')
    .insert([toInsert])
    .select('id')
    .limit(1);
  if (insErr) {
    // unique race: refetch
    const { data: re, error: reErr } = await sb
      .from('games')
      .select('id')
      .eq('provider_game_id', provider_event_id)
      .limit(1);
    if (reErr) throw reErr;
    if (re && re.length) return re[0].id;
    throw insErr;
  }
  return ins?.[0]?.id;
}

async function insertSnapshot(uuid, summary) {
  const row = {
    game_id: uuid, // uuid fk to games.id
    book: 'oddsapi',
    fetched_at: new Date().toISOString(),
    moneyline_home: summary.moneyline_home,
    moneyline_away: summary.moneyline_away,
    spread_line: summary.spread_line,
    spread_price_home: summary.spread_price_home,
    spread_price_away: summary.spread_price_away,
    total_line: summary.total_line,
    total_over_price: summary.total_over_price,
    total_under_price: summary.total_under_price,
  };
  const { error } = await sb.from('odds_snapshots').insert([row]);
  if (error && error.code !== '23505') throw error; // ignore dedupe collisions
}

async function ingestLeague(sport) {
  const events = await fetchOddsEvents(sport);
  let wrote = 0;
  for (const ev of events) {
    try {
      const summary = summarizeEvent(ev);
      const uuid = await ensureGameAndGetUuid({
        sport,
        provider_event_id: summary.provider_event_id,
        home_team: summary.home_team,
        away_team: summary.away_team,
        commence_time: summary.commence_time,
      });
      await insertSnapshot(uuid, summary);
      wrote++;
    } catch (e) {
      console.error(`[${sport}] snapshot error for ${ev?.id || 'unknown'}:`, e?.message || e);
    }
  }
  console.log(`[${sport}] events=${events.length} wrote_snapshots=${wrote}`);
  return wrote;
}

async function main() {
  const leagues = (process.argv[2] || 'nfl,mlb,ncaaf')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  let total = 0;
  for (const lg of leagues) {
    try {
      total += await ingestLeague(lg);
    } catch (e) {
      console.error(`[${lg}] FAILED`, e?.message || e);
    }
  }
  console.log(`Total snapshots written: ${total}`);
}
main().catch(e => { console.error(e); process.exit(1); });
