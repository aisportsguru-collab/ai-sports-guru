/** Shared data utilities for league pages */

export type LeagueId = 'nfl'|'nba'|'mlb'|'nhl'|'ncaaf'|'ncaab'|'wnba';

export type SidePrice = { line?: number|null; price?: number|null };
export type Moneyline = { away?: number|null; home?: number|null; book?: string|null };
export type Spread   = { away?: SidePrice;  home?: SidePrice;  book?: string|null };
export type Total    = { over?: SidePrice;  under?: SidePrice; book?: string|null };

export type PredictionSide = {
  pick?: string | null;                 // e.g. 'HOME' | 'AWAY' | 'OVER' | 'UNDER'
  confidencePct?: number | null;        // 0–100
  confidence?: number | null;           // 0–100 or sometimes 0–1 (we handle both)
  probability?: number | null;          // 0–1 (we convert)
};

export type GamePrediction = {
  moneyline?: PredictionSide | null;
  spread?:    PredictionSide | null;
  total?:     PredictionSide | null;
};

export type LeagueGame = {
  id: string;
  league: LeagueId;
  kickoffISO?: string | null;
  away: string;
  home: string;
  awayTeam?: { name?: string; short?: string } | null;
  homeTeam?: { name?: string; short?: string } | null;
  odds?: {
    moneyline?: Moneyline | null;
    spread?:    Spread   | null;
    total?:     Total    | null;
  } | null;
  predictions?: GamePrediction | null;
};

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ||
  // fallback to your current prod deploy:
  "https://ai-sports-guru-ek55nturj-jordan-smiths-projects-aba7b6c0.vercel.app";

function qs(params: Record<string,string|number|undefined>): string {
  const s = Object.entries(params)
    .filter(([,v]) => v !== undefined && v !== null && v !== '')
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return s ? `?${s}` : '';
}

function toNum(n: any): number | null {
  if (n === 0) return 0;
  if (!n && n !== 0) return null;
  const x = typeof n === 'string' ? Number(n) : n;
  const y = Number(x);
  return Number.isFinite(y) ? y : null;
}

function side(obj: any): SidePrice {
  if (obj == null) return { line: null, price: null };
  if (typeof obj === 'number' || typeof obj === 'string') return { line: toNum(obj), price: null };
  return { line: toNum(obj.line), price: toNum(obj.price ?? obj.odds) };
}

function normalizeGame(raw: any): LeagueGame {
  const league = String(raw.league ?? '').toLowerCase() as LeagueId;
  const odds   = raw.odds ?? {};
  const moneyline = odds.moneyline ?? {};
  const spread    = odds.spread ?? {};
  const total     = odds.total ?? {};

  const g: LeagueGame = {
    id: String(raw.id ?? `${league}-${raw.away ?? ''}-${raw.home ?? ''}-${raw.kickoffISO ?? raw.kickoff ?? ''}`),
    league,
    kickoffISO: raw.kickoffISO ?? raw.kickoff ?? null,
    away: String(raw.away ?? raw.awayTeam?.name ?? 'Away'),
    home: String(raw.home ?? raw.homeTeam?.name ?? 'Home'),
    awayTeam: raw.awayTeam ?? null,
    homeTeam: raw.homeTeam ?? null,
    odds: {
      moneyline: {
        away: toNum(moneyline.away),
        home: toNum(moneyline.home),
        book: moneyline.book ?? odds.book ?? null,
      },
      spread: {
        away: side(spread.away),
        home: side(spread.home),
        book: spread.book ?? odds.book ?? null,
      },
      total: {
        over:  side(total.over),
        under: side(total.under),
        book:  total.book ?? odds.book ?? null,
      },
    },
    predictions: raw.predictions ?? null,
  };

  return g;
}

/** Accepts old or new response shapes and always returns an array of normalized games + meta */
export async function listGames(params: {
  league: LeagueId;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}): Promise<{ games: LeagueGame[]; meta: { count: number; source?: string } }> {
  const url = `${API_BASE}/api/games-with-predictions${qs(params)}`;
  const res = await fetch(url, { headers: { 'cache-control':'no-cache' } });

  if (!res.ok) {
    console.log('[listGames] HTTP %s %s', res.status, url);
    return { games: [], meta: { count: 0, source: 'error' } };
  }

  const json: any = await res.json();

  // Old/new shapes we support:
  // - { ok, games: [...] , meta: { count, source } }
  // - { ok, results: [{ league, games:[...], meta:{...} }, ...] }
  // - { ok, data:[...], meta:{...} } (just in case)
  let gamesRaw: any[] =
    (Array.isArray(json.games) && json.games) ||
    (Array.isArray(json.data) && json.data) ||
    (Array.isArray(json.results) && json.results.find((r:any) =>
      (String(r.league ?? '').toLowerCase() === String(params.league))
    )?.games) ||
    [];

  const metaObj: any =
    json.meta ||
    (Array.isArray(json.results) && json.results.find((r:any) =>
      (String(r.league ?? '').toLowerCase() === String(params.league))
    )?.meta) ||
    {};

  const games = gamesRaw.map(normalizeGame);
  const meta  = { count: Number(metaObj.count ?? games.length ?? 0), source: metaObj.source };

  console.log('[listGames] ok league=%s count=%d source=%s', params.league, meta.count, meta.source ?? 'n/a');
  return { games, meta };
}

/** Simple hook for screens */
import { useEffect, useMemo, useState, useCallback } from 'react';

export function useLeagueGames(league: LeagueId) {
  const [games, setGames] = useState<LeagueGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ count: number; source?: string }>({ count: 0 });

  const todayISO = new Date().toISOString().slice(0,10);
  const toISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    return d.toISOString().slice(0,10);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { games, meta } = await listGames({ league, from: todayISO, to: toISO });
      setGames(games);
      setMeta(meta);
    } finally {
      setLoading(false);
    }
  }, [league, todayISO, toISO]);

  useEffect(() => { load(); }, [load]);

  return { games, loading, meta, reload: load };
}
