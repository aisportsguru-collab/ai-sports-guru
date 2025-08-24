import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

type FadeQuery = {
  league?: string;
  dateFrom?: string;
  dateTo?: string;
  publicThreshold?: number;
  minConfidence?: number;
};

function impliedFavorite(
  homeTeam: string,
  awayTeam: string,
  mlHome?: number | null,
  mlAway?: number | null
): { side: 'HOME' | 'AWAY' | null; team: string | null } {
  if (typeof mlHome !== 'number' || typeof mlAway !== 'number') return { side: null, team: null };
  if (mlHome === mlAway) return { side: null, team: null };
  return mlHome < mlAway ? { side: 'HOME', team: homeTeam } : { side: 'AWAY', team: awayTeam };
}

// proxy “public strength” based on moneyline gap
function publicStrengthPct(mlHome?: number | null, mlAway?: number | null): number | null {
  if (typeof mlHome !== 'number' || typeof mlAway !== 'number') return null;
  const diff = Math.abs(Math.abs(mlHome) - Math.abs(mlAway));
  const pct = 50 + Math.min(25, (diff / 400) * 25);
  return Math.round(pct);
}

export async function fetchFades(q: FadeQuery) {
  const league = q.league?.toLowerCase();
  const dateFrom = q.dateFrom;
  const dateTo = q.dateTo;
  const publicThreshold = q.publicThreshold ?? 60;
  const minConfidence = q.minConfidence ?? 55;

  // Select only columns known to exist in your predictions table
  let sel = supabase
    .from('predictions')
    .select(
      [
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

  if (league && league !== 'all') sel = sel.eq('sport', league);
  if (dateFrom) sel = sel.gte('game_date', dateFrom);
  if (dateTo) sel = sel.lte('game_date', dateTo);

  const { data, error } = await sel;

  if (error) return { count: 0, rows: [], note: `predictions error: ${error.message}` };
  if (!data || data.length === 0) return { count: 0, rows: [], note: 'no predictions found for filters' };

  const rows = [];
  for (const r of data) {
    const fav = impliedFavorite(r.home_team, r.away_team, r.moneyline_home, r.moneyline_away);
    const publicPct = publicStrengthPct(r.moneyline_home, r.moneyline_away);
    if (!fav.side || publicPct == null) continue;

    const modelWinner = r.predicted_winner || null;
    const confs = [r.conf_moneyline, r.conf_spread, r.conf_total].filter((x) => typeof x === 'number') as number[];
    const maxConf = confs.length ? Math.max(...confs) : null;
    if (!modelWinner || maxConf == null) continue;

    const isFade = modelWinner !== fav.team && maxConf >= minConfidence && publicPct >= publicThreshold;
    if (!isFade) continue;

    rows.push({
      sport: r.sport,
      game_date: r.game_date,
      commence_time: r.commence_time,
      home_team: r.home_team,
      away_team: r.away_team,
      moneyline_home: r.moneyline_home,
      moneyline_away: r.moneyline_away,
      spread_line: r.spread_line,
      spread_price_home: r.spread_price_home,
      spread_price_away: r.spread_price_away,
      total_line: r.total_line,
      total_over_price: r.total_over_price,
      total_under_price: r.total_under_price,
      predicted_winner: modelWinner,
      pick_moneyline: r.pick_moneyline,
      pick_spread: r.pick_spread,
      pick_total: r.pick_total,
      conf_moneyline: r.conf_moneyline,
      conf_spread: r.conf_spread,
      conf_total: r.conf_total,
      public_side: fav.side,
      public_team: fav.team,
      public_strength_pct: publicPct
    });
  }

  return {
    count: rows.length,
    rows,
    note: rows.length === 0 ? 'no fade candidates with current thresholds (using moneyline gap as public proxy)' : undefined
  };
}
