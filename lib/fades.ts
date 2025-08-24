import { createClient } from '@supabase/supabase-js';

type Params = {
  league?: string;        // nfl, nba, etc — if omitted => all
  dateFrom?: string;      // 'YYYY-MM-DD'
  dateTo?: string;        // 'YYYY-MM-DD'
  publicThreshold?: number; // % of public money on one side to consider "heavy"
  minConfidence?: number;   // model confidence threshold
};

// Minimal admin client (server only)
function admin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Supabase admin env vars are missing');
  return createClient(url, key);
}

/**
 * fetchFades: looks for games where public money is heavy on one side,
 * but your model pick is the opposite ("fade the public").
 *
 * Expected tables (safe if missing — returns empty):
 *  - predictions (your model outputs)
 *  - public_bets (columns: sport, game_date, home_team, away_team,
 *                public_side ('HOME'|'AWAY'|'OVER'|'UNDER'), public_percent number)
 */
export async function fetchFades(params: Params) {
  const {
    league,
    dateFrom,
    dateTo,
    publicThreshold = 60,
    minConfidence = 55,
  } = params;

  const supa = admin();

  // Step 1: fetch predictions in range / league
  let predQ = supa.from('predictions')
    .select('*')
    .gte('season', 2024); // coarse guard so the table can use an index

  if (league) predQ = predQ.eq('sport', league);
  if (dateFrom) predQ = predQ.gte('game_date', dateFrom);
  if (dateTo) predQ = predQ.lte('game_date', dateTo);

  const predRes = await predQ.limit(2000);
  if (predRes.error) {
    // If predictions table doesn’t exist, return an empty result with note
    if (/relation .* does not exist/i.test(predRes.error.message)) {
      return { count: 0, rows: [], note: 'predictions table not found' };
    }
    throw predRes.error;
  }

  // Step 2: fetch public betting splits to compare
  let publicQ = supa.from('public_bets')
    .select('*');

  if (league) publicQ = publicQ.eq('sport', league);
  if (dateFrom) publicQ = publicQ.gte('game_date', dateFrom);
  if (dateTo) publicQ = publicQ.lte('game_date', dateTo);

  const pubRes = await publicQ.limit(2000);
  if (pubRes.error) {
    // If public_bets table doesn’t exist, just return nothing so the page still works
    if (/relation .* does not exist/i.test(pubRes.error.message)) {
      return { count: 0, rows: [], note: 'public_bets table not found' };
    }
    throw pubRes.error;
  }

  const pubs = pubRes.data || [];
  const byKey = new Map<string, any[]>();
  for (const r of pubs) {
    const key = `${(r.sport || '').toLowerCase()}|${r.game_date}|${r.home_team}|${r.away_team}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(r);
  }

  const rows: any[] = [];
  for (const p of (predRes.data || [])) {
    const key = `${(p.sport || '').toLowerCase()}|${p.game_date}|${p.home_team}|${p.away_team}`;
    const candidates = byKey.get(key) || [];

    // choose the strongest public signal at/above threshold
    const strong = candidates
      .filter((c) => typeof c.public_percent === 'number' && c.public_percent >= publicThreshold)
      .sort((a,b) => (b.public_percent ?? 0) - (a.public_percent ?? 0))[0];

    if (!strong) continue;

    // model pick side (moneyline or spread -> HOME/AWAY; total -> OVER/UNDER)
    const modelSide =
      p.pick_moneyline ?? // prefer ML if present
      (p.pick_spread ? (p.pick_spread.startsWith('HOME') ? 'HOME' : 'AWAY') : null) ??
      (p.pick_total ? (p.pick_total.startsWith('OVER') ? 'OVER' : 'UNDER') : null);

    const modelConf =
      p.conf_moneyline ??
      p.conf_spread ??
      p.conf_total ??
      p.confidence ?? 0;

    if (!modelSide || typeof modelConf !== 'number' || modelConf < minConfidence) continue;

    // FADE condition: model is opposite side of where public is heavy
    const isFade =
      (strong.public_side === 'HOME' && modelSide === 'AWAY') ||
      (strong.public_side === 'AWAY' && modelSide === 'HOME') ||
      (strong.public_side === 'OVER' && modelSide === 'UNDER') ||
      (strong.public_side === 'UNDER' && modelSide === 'OVER');

    if (!isFade) continue;

    rows.push({
      sport: p.sport,
      game_date: p.game_date,
      commence_time: p.commence_time,
      home_team: p.home_team,
      away_team: p.away_team,

      public_side: strong.public_side,
      public_percent: strong.public_percent,

      model_side: modelSide,
      model_confidence: modelConf,

      // optional odds context
      moneyline_home: p.moneyline_home ?? null,
      moneyline_away: p.moneyline_away ?? null,
      spread_line: p.spread_line ?? null,
      spread_price_home: p.spread_price_home ?? null,
      spread_price_away: p.spread_price_away ?? null,
      total_line: p.total_line ?? null,
      total_over_price: p.total_over_price ?? null,
      total_under_price: p.total_under_price ?? null,
    });
  }

  // strongest first
  rows.sort((a,b) => (b.public_percent ?? 0) - (a.public_percent ?? 0));

  return { count: rows.length, rows };
}
