const BASE =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
  'https://aisportsguru.com';

type FadeQuery = {
  league?: string;       // "nfl" | "nba" | "mlb" | ... | "all"
  dateFrom?: string;     // "YYYY-MM-DD" (optional)
  dateTo?: string;       // "YYYY-MM-DD" (optional)
  publicThreshold?: number; // default 60
  minConfidence?: number;   // default 55
};

type Pred = {
  sport: string;
  game_date: string | null;
  commence_time?: string | null;
  home_team: string;
  away_team: string;
  moneyline_home?: number | null;
  moneyline_away?: number | null;
  spread_line?: number | null;
  spread_price_home?: number | null;
  spread_price_away?: number | null;
  total_line?: number | null;
  total_over_price?: number | null;
  total_under_price?: number | null;
  predicted_winner?: string | null;
  pick_moneyline?: string | null;
  pick_spread?: string | null;
  pick_total?: string | null;
  conf_moneyline?: number | null;
  conf_spread?: number | null;
  conf_total?: number | null;
};

// pick which side is the favorite from moneylines
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

// crude “public strength” proxy using ML gap
function publicStrengthPct(mlHome?: number | null, mlAway?: number | null): number | null {
  if (typeof mlHome !== 'number' || typeof mlAway !== 'number') return null;
  const diff = Math.abs(Math.abs(mlHome) - Math.abs(mlAway));
  const pct = 50 + Math.min(25, (diff / 400) * 25); // caps at ~75%
  return Math.round(pct);
}

const ALL_LEAGUES = ['nfl','nba','mlb','nhl','ncaaf','ncaab','wnba'];

async function fetchLeaguePreds(league: string): Promise<Pred[]> {
  const url = `${BASE}/api/predictions/${league}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`predictions ${league} ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.data) ? (json.data as Pred[]) : [];
}

export async function fetchFades(q: FadeQuery) {
  const leagues = q.league && q.league !== 'all'
    ? [q.league.toLowerCase()]
    : ALL_LEAGUES;

  const publicThreshold = q.publicThreshold ?? 60;
  const minConfidence = q.minConfidence ?? 55;
  const dateFrom = q.dateFrom;
  const dateTo = q.dateTo;

  // fetch all selected leagues in parallel
  const lists = await Promise.allSettled(leagues.map(fetchLeaguePreds));
  const preds: Pred[] = [];
  const notes: string[] = [];

  lists.forEach((r, i) => {
    const lg = leagues[i];
    if (r.status === 'fulfilled') preds.push(...r.value);
    else notes.push(`predictions ${lg} failed: ${r.reason}`);
  });

  // optional date filtering
  const inRange = (d: string | null | undefined) => {
    if (!d || typeof d !== 'string') return true;
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  };

  const rows: any[] = [];
  for (const r of preds) {
    if (!inRange(r.game_date)) continue;

    const fav = impliedFavorite(r.home_team, r.away_team, r.moneyline_home ?? null, r.moneyline_away ?? null);
    const publicPct = publicStrengthPct(r.moneyline_home ?? null, r.moneyline_away ?? null);
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
    note:
      rows.length === 0
        ? (notes.length ? `no fades; (${notes.join(' | ')})` : 'no fade candidates with current thresholds')
        : undefined,
  };
}
