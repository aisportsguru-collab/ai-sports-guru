import { createClient } from '@supabase/supabase-js';

type Params = {
  league?: string;
  dateFrom?: string;
  dateTo?: string;
  publicThreshold?: number;
  minConfidence?: number;
};

// Safe admin client (returns null if env missing)
function safeAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Find games where the public is heavy on one side but our model prefers the other.
 * Will return { count: 0, rows: [], note: "..."} instead of throwing when tables or env are missing.
 */
export async function fetchFades(params: Params) {
  const {
    league,
    dateFrom,
    dateTo,
    publicThreshold = 60,
    minConfidence = 55,
  } = params;

  const supa = safeAdmin();
  if (!supa) {
    return { count: 0, rows: [], note: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
  }

  // --- predictions ---
  try {
    let predQ = supa.from('predictions').select('*').gte('season', 2024);
    if (league) predQ = predQ.eq('sport', league);
    if (dateFrom) predQ = predQ.gte('game_date', dateFrom);
    if (dateTo) predQ = predQ.lte('game_date', dateTo);
    const predRes = await predQ.limit(2000);

    if (predRes.error) {
      if (/relation .* does not exist/i.test(predRes.error.message)) {
        return { count: 0, rows: [], note: 'predictions table not found' };
      }
      return { count: 0, rows: [], note: `predictions error: ${predRes.error.message}` };
    }

    // --- public_bets ---
    let publicQ = supa.from('public_bets').select('*');
    if (league) publicQ = publicQ.eq('sport', league);
    if (dateFrom) publicQ = publicQ.gte('game_date', dateFrom);
    if (dateTo) publicQ = publicQ.lte('game_date', dateTo);
    const pubRes = await publicQ.limit(2000);

    if (pubRes.error) {
      if (/relation .* does not exist/i.test(pubRes.error.message)) {
        return { count: 0, rows: [], note: 'public_bets table not found' };
      }
      return { count: 0, rows: [], note: `public_bets error: ${pubRes.error.message}` };
    }

    const pubs = pubRes.data || [];
    const map = new Map<string, any[]>();
    for (const r of pubs) {
      const key = `${(r.sport || '').toLowerCase()}|${r.game_date}|${r.home_team}|${r.away_team}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }

    const rows: any[] = [];
    for (const p of (predRes.data || [])) {
      const key = `${(p.sport || '').toLowerCase()}|${p.game_date}|${p.home_team}|${p.away_team}`;
      const candidates = map.get(key) || [];

      const strong = candidates
        .filter((c) => typeof c.public_percent === 'number' && c.public_percent >= publicThreshold)
        .sort((a,b) => (b.public_percent ?? 0) - (a.public_percent ?? 0))[0];

      if (!strong) continue;

      const modelSide =
        p.pick_moneyline ??
        (p.pick_spread ? (String(p.pick_spread).startsWith('HOME') ? 'HOME' : 'AWAY') : null) ??
        (p.pick_total ? (String(p.pick_total).startsWith('OVER') ? 'OVER' : 'UNDER') : null);

      const modelConf =
        p.conf_moneyline ?? p.conf_spread ?? p.conf_total ?? p.confidence ?? 0;

      if (!modelSide || typeof modelConf !== 'number' || modelConf < minConfidence) continue;

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

    rows.sort((a,b) => (b.public_percent ?? 0) - (a.public_percent ?? 0));
    return { count: rows.length, rows };
  } catch (e: any) {
    return { count: 0, rows: [], note: `unexpected error: ${String(e?.message || e)}` };
  }
}
