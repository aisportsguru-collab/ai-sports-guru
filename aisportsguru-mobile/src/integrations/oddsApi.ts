/**
 * Lightweight client for The Odds API v4.
 * Docs: https://the-odds-api.com/
 */
const ODDS_KEY = process.env.EXPO_PUBLIC_ODDS_API_KEY || '';

export type OddsMarket =
  | 'h2h'       // moneyline
  | 'spreads'
  | 'totals';

type OddsOutcome = {
  name: string;           // team name or 'Over'/'Under'
  price?: number;         // american odds (-110, +120)
  point?: number;         // spread/total line (e.g. -2.5, 45.5)
};

type OddsMarketEntry = {
  key: OddsMarket;
  outcomes: OddsOutcome[];
};

type OddsBookmaker = {
  key: string;                  // e.g. 'draftkings'
  markets: OddsMarketEntry[];
};

type OddsEvent = {
  id: string;
  commence_time: string;        // ISO datetime
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
};

export type OddsPack = {
  kickoffISO: string;
  home: string;
  away: string;
  moneyline?: { home?: number; away?: number; draw?: number; book?: string };
  spread?:    { line?: number; home?: number; away?: number; book?: string };
  total?:     { line?: number; over?: number; under?: number; book?: string };
};

export function leagueToOddsSport(leagueId: string): string | null {
  switch (leagueId) {
    case 'nfl':              return 'americanfootball_nfl';
    case 'nba':              return 'basketball_nba';
    case 'mlb':              return 'baseball_mlb';
    case 'nhl':              return 'icehockey_nhl';
    case 'ncaa_football':    return 'americanfootball_ncaaf';
    case 'ncaa_basketball':  return 'basketball_ncaab';
    default: return null;
  }
}

function best<T>(arr: Array<{price?: number} & T> | undefined) {
  if (!arr || !arr.length) return undefined;
  // Choose the *best* price from bettor perspective (max for +, min absolute for -)
  return arr.reduce((acc, x) => {
    if (x.price == null) return acc;
    if (!acc) return x;
    // Prefer higher positive; for negative, prefer closer to zero (e.g. -102 over -115)
    if (x.price >= 0 && (acc.price ?? -Infinity) >= 0) return x.price > (acc.price ?? 0) ? x : acc;
    if (x.price >= 0 && (acc.price ?? 0) < 0) return x;               // any + better than -
    if (x.price < 0 && (acc.price ?? 0) < 0) return x.price > (acc.price ?? -9999) ? x : acc;
    return acc;
  }, undefined as (typeof arr)[number] | undefined);
}

export async function fetchOddsForLeague(leagueId: string): Promise<OddsPack[]> {
  const sport = leagueToOddsSport(leagueId);
  if (!sport) return [];
  if (!ODDS_KEY) throw new Error('Missing EXPO_PUBLIC_ODDS_API_KEY');

  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso&apiKey=${ODDS_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Odds API ${res.status}`);
  const events = (await res.json()) as OddsEvent[];

  const packs: OddsPack[] = events.map((ev) => {
    // collapse across all books -> choose best by market/outcome
    const allH2H: Array<{book: string; outcome: OddsOutcome}> = [];
    const allSpreads: Array<{book: string; outcome: OddsOutcome; line?: number}> = [];
    const allTotals: Array<{book: string; outcome: OddsOutcome; line?: number}> = [];

    for (const bk of ev.bookmakers || []) {
      for (const m of bk.markets || []) {
        if (m.key === 'h2h') {
          for (const o of m.outcomes || []) allH2H.push({ book: bk.key, outcome: o });
        } else if (m.key === 'spreads') {
          for (const o of m.outcomes || []) allSpreads.push({ book: bk.key, outcome: o, line: o.point });
        } else if (m.key === 'totals') {
          for (const o of m.outcomes || []) allTotals.push({ book: bk.key, outcome: o, line: o.point });
        }
      }
    }

    const bestHomeML = best(allH2H.filter(x => x.outcome.name === ev.home_team).map(x => ({...x.outcome, book: x.book} as any)));
    const bestAwayML = best(allH2H.filter(x => x.outcome.name === ev.away_team).map(x => ({...x.outcome, book: x.book} as any)));
    const bestDrawML = best(allH2H.filter(x => /draw/i.test(x.outcome.name)).map(x => ({...x.outcome, book: x.book} as any)));

    // For spreads, pick a representative line by choosing the outcome whose |point| is smallest absolute (closest to 0),
    // then best price at that line for home/away separately.
    const linesSet = Array.from(new Set(allSpreads.map(x => x.line).filter(l => typeof l === 'number'))) as number[];
    const canonicalLine = linesSet.sort((a,b) => Math.abs(a) - Math.abs(b))[0];

    const bestHomeSpread = best(
      allSpreads.filter(x => x.outcome.name === ev.home_team && x.line === canonicalLine)
                .map(x => ({...x.outcome, book: x.book} as any))
    );
    const bestAwaySpread = best(
      allSpreads.filter(x => x.outcome.name === ev.away_team && x.line === canonicalLine)
                .map(x => ({...x.outcome, book: x.book} as any))
    );

    const totalLines = Array.from(new Set(allTotals.map(x => x.line).filter(l => typeof l === 'number'))) as number[];
    const canonicalTotal = totalLines.sort((a,b) => Math.abs(a - 45.5) - Math.abs(b - 45.5))[0] ?? totalLines[0];

    const bestOver = best(
      allTotals.filter(x => /^over$/i.test(x.outcome.name) && x.line === canonicalTotal)
               .map(x => ({...x.outcome, book: x.book} as any))
    );
    const bestUnder = best(
      allTotals.filter(x => /^under$/i.test(x.outcome.name) && x.line === canonicalTotal)
               .map(x => ({...x.outcome, book: x.book} as any))
    );

    return {
      kickoffISO: ev.commence_time,
      home: ev.home_team,
      away: ev.away_team,
      moneyline: (bestHomeML || bestAwayML || bestDrawML) ? {
        home: bestHomeML?.price,
        away: bestAwayML?.price,
        draw: bestDrawML?.price,
        book: (bestHomeML as any)?.book || (bestAwayML as any)?.book || (bestDrawML as any)?.book,
      } : undefined,
      spread: (canonicalLine != null && (bestHomeSpread || bestAwaySpread)) ? {
        line: canonicalLine,
        home: bestHomeSpread?.price,
        away: bestAwaySpread?.price,
        book: (bestHomeSpread as any)?.book || (bestAwaySpread as any)?.book,
      } : undefined,
      total: (canonicalTotal != null && (bestOver || bestUnder)) ? {
        line: canonicalTotal,
        over: bestOver?.price,
        under: bestUnder?.price,
        book: (bestOver as any)?.book || (bestUnder as any)?.book,
      } : undefined,
    };
  });

  return packs;
}
