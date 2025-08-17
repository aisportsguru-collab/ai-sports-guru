import { getCache, setCache } from '../lib/cache'; // existing cache helpers
import type { LeagueId } from '../constants/leagues';

const BASE = process.env.EXPO_PUBLIC_API_BASE;        // e.g. https://api.aisportsguru.com
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === '1';
const TTL_MS = 15 * 60 * 1000; // 15 minutes

export type LeagueGame = {
  id: string;
  league: LeagueId;
  startTimeISO: string;
  homeTeam: string;
  awayTeam: string;
  market: 'SPREAD' | 'TOTAL' | 'MONEYLINE';
  line?: string;
  oddsHome?: number;
  oddsAway?: number;
  confidence?: number;
};

export async function fetchLeagueGames(league: LeagueId, force = false): Promise<LeagueGame[]> {
  const key = `league:${league}`;
  if (!force) {
    const cached = await getCache<LeagueGame[]>(key, TTL_MS);
    if (cached) return cached;
  }

  let data: LeagueGame[];
  if (USE_MOCK || !BASE) {
    data = (await import(`../mock/league-${league}.ts`)).default as LeagueGame[];
  } else {
    const res = await fetch(`${BASE}/v1/games?league=${league}`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  }

  await setCache(key, data);
  return data;
}
