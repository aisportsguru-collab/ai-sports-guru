import { getCache, setCache } from '../utils/cache';

export type LeagueId = 'nfl'|'nba'|'mlb'|'nhl'|'ncaa_football'|'ncaa_basketball';
export type Market = 'ML'|'SPREAD'|'TOTAL';

export type LeagueMarketPrediction = {
  league: LeagueId;
  homeTeam: string;
  awayTeam: string;
  kickoffISO?: string;
  market: Market;
  pick: 'HOME'|'AWAY'|'OVER'|'UNDER';
  line?: number;
  edgePct?: number;
};

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const BASE = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

/** Fetch predictions for a league from the website API, cached per-day. */
export async function fetchLeaguePredictions(league: string): Promise<LeagueMarketPrediction[]> {
  const day = new Date().toISOString().slice(0,10);
  const key = `preds:${league}:${day}`;
  // Try cache first
  const cached = await getCache<LeagueMarketPrediction[]>(key, TTL_MS);
  if (cached) return cached;

  if (!BASE) return [];

  try {
    const res = await fetch(`${BASE}/predictions?league=${encodeURIComponent(league)}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as LeagueMarketPrediction[] | null;
    const arr = Array.isArray(data) ? data : [];
    await setCache(key, arr);
    return arr;
  } catch {
    return [];
  }
}

function canon(s: string) { return s.trim().toLowerCase(); }
function keyFor(league: string, home: string, away: string, iso?: string) {
  const d = (iso || '').slice(0,10);
  return `${league.toLowerCase()}|${d}|${canon(home)}|${canon(away)}`;
}

/** Index predictions by game key for quick lookup in UI. */
export function indexPredictionsByGame(preds: LeagueMarketPrediction[]) {
  const map = new Map<string, LeagueMarketPrediction[]>();
  for (const p of preds) {
    const k = keyFor(p.league, p.homeTeam, p.awayTeam, p.kickoffISO);
    const list = map.get(k) || [];
    list.push(p);
    map.set(k, list);
  }
  // Sort markets for consistent display: SPREAD, ML, TOTAL
  for (const [k, list] of map.entries()) {
    list.sort((a,b) => {
      const order = { SPREAD:0, ML:1, TOTAL:2 } as Record<Market, number>;
      return (order[a.market] ?? 9) - (order[b.market] ?? 9);
    });
    map.set(k, list);
  }
  return map;
}

export const _debugKeyFor = keyFor; // optional helper for tests
