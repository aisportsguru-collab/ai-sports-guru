import { getCache, setCache } from '../utils/cache';

export type MarketML = { home: number; away: number };
export type Game = {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffISO: string;
  markets?: {
    spread?: number;
    total?: number;
    ml?: MarketML;
  };
};

const TTL_MS = 60_000; // 1 min cache
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL || '';

export async function listGames(league: string, day: string): Promise<Game[]> {
  const key = `games:${league}:${day}`;
  const cached = await getCache<Game[]>(key, TTL_MS);
  if (cached) return cached;

  if (!BASE) return [];

  try {
    const res = await fetch(`${BASE}/games?league=${league}&date=${day}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const items = Array.isArray(json?.items) ? json.items as Game[] : [];
    await setCache(key, items);
    return items;
  } catch {
    // no mock fallback; just return []
    await setCache(key, []);
    return [];
  }
}
