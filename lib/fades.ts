import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

// Very defensive client creation (service role if present; anon otherwise)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

type FadeQuery = {
  league?: string;          // 'mlb' | 'nfl' | ...
  dateFrom?: string;        // 'YYYY-MM-DD'
  dateTo?: string;          // 'YYYY-MM-DD'
  publicThreshold?: number; // e.g. 60 (meaning we’ll only include when “public side” is strongly implied)
  minConfidence?: number;   // e.g. 55 (minimum of any pick confidence)
};

// Infer an implied favorite from moneyline odds (more negative = stronger favorite)
function impliedFavorite(
  homeTeam: string,
  awayTeam: string,
  mlHome?: number | null,
  mlAway?: number | null
): { side: 'HOME' | 'AWAY' | null; team: string | null } {
  if (typeof mlHome !== 'number' || typeof mlAway !== 'number') {
    return { side: null, team: null };
  }
  if (mlHome === mlAway) {
    return { side: null, team: null };
  }
  // “More negative” is the favorite, e.g. -150 beats +130
  if (mlHome < mlAway) {
    return { side: 'HOME', team: homeTeam };
  } else {
    return { side: 'AWAY', team: awayTeam };
  }
}

// a crude “public strength” proxy using moneyline absolute difference.
// (This is a temporary stand‑in until we wire a real public-money feed.)
function publicStrengthPct(mlHome?: number | null, mlAway?: number | null): number | null {
  if (typeof mlHome !== 'number' || typeof mlAway !== 'number') return null;
  const diff = Math.abs(Math.abs(mlHome) - Math.abs(mlAway)); // larger gap => stronger implied side
  // Map 0..400+ gap roughly to 50..75%
  const pct = 50 + Math.min(25, (diff / 400) * 25);
  return Math.round(pct);
}

export async function fetchFades(q: FadeQuery) {
  const league = q.league?.toLowerCase();
  const dateFrom = q.dateFrom;
  const dateTo = q.dateTo;
  const publicThreshold = q.publicThreshold ?? 60;
  const minConfidence = q.minConfidence ?? 55;

  // Select ONLY columns we know exist in your table (no season, no public_*).
  // These columns match what your /api/predictions mapping returns.
  let sel = supabase
    .from('predictions')
    .select(
      [
        'external_id',
        'sport',
        'game_date',
        'commence_time',
        'home_team',
        'away_team',
        'moneyline_home',
        'moneyline_away',
        'spread_line',
        'spread_price_home',
        'spread_price_away',
        'total_line',
        'total_over_price',
        'total_under_price',
        'predicted_winner',
        'pick_moneyline',
        'pick_spread',
        'pick_total',
        'conf_moneyline',
        'conf_spread',
        'conf_total'
      ].join(',')
    )
    .order('game_date', { ascending: false })
    .limit(400);

  if (league && league !== 'all') {
    sel = sel.eq('sport', league);
  }
  if (dateFrom) sel = sel.gte('game_date', dateFrom);
  if (dateTo) sel = sel.lte('game_date', dateTo);

  const { data, error } = await sel;

  if (error) {
    return { count: 0, rows: [], note: `predictions error: ${error.message}` };
  }
  if (!data || data.length === 0) {
    return { count: 0, rows: [], note: 'no predictions found for filters' };
  }

  // Build “fade” candidates:
  // - Determine implied favorite from moneyline odds (proxy for “public side”)
  // - If model’s predicted_winner != implied favorite AND confidence >= minConfidence
  // - Also require proxy publicStrengthPct >= publicThreshold
  const rows = [];
  for (const r of data) {
    const fav = impliedFavorite(r.home_team, r.away_team, r.moneyline_home, r.moneyline_away);
    const publicPct = publicStrengthPct(r.moneyline_home, r.moneyline_away);

    if (!fav.side || publicPct == null) continue; // can’t decide a “public” side here

    const modelWinner = r.predicted_winner || null;

    // compute max confidence among the three pick confidences (if present)
    const confs = [r.conf_moneyline, r.conf_spread, r.conf_total].filter(
      (x) => typeof x === 'number'
    ) as number[];
    const maxConf = confs.length ? Math.max(...confs) : null;

    if (!modelWinner || maxConf == null) continue;

    // “Fade” = model opposes the implied favorite and we have decent confidence
    const isFade = modelWinner !== fav.team && maxConf >= minConfidence && publicPct >= publicThreshold;
    if (!isFade) continue;

    rows.push({
      sport: r.sport,
      game_date: r.game_date,
      commence_time: r.commence_time,
      home_team: r.home_team,
      away_team: r.away_team,

      // odds snapshot
      moneyline_home: r.moneyline_home,
      moneyline_away: r.moneyline_away,
      spread_line: r.spread_line,
      spread_price_home: r.spread_price_home,
      spread_price_away: r.spread_price_away,
      total_line: r.total_line,
      total_over_price: r.total_over_price,
      total_under_price: r.total_under_price,

      // model
      predicted_winner: modelWinner,
      pick_moneyline: r.pick_moneyline,
      pick_spread: r.pick_spread,
      pick_total: r.pick_total,
      conf_moneyline: r.conf_moneyline,
      conf_spread: r.conf_spread,
      conf_total: r.conf_total,

      // “public” proxy
      public_side: fav.side,
      public_team: fav.team,
      public_strength_pct: publicPct
    });
  }

  return {
    count: rows.length,
    rows,
    note:
      rows.length === 0
        ? 'no fade candidates with current thresholds (using moneyline gap as public proxy)'
        : undefined
  };
}
