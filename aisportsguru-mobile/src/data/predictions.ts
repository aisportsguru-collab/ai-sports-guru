import { getCache, setCache } from '../utils/cache';

export type Prediction = {
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffISO: string;
  market: 'ML' | 'SPREAD' | 'TOTAL';
  pick: 'HOME' | 'AWAY' | 'OVER' | 'UNDER';
  line?: number;
  edgePct?: number;
};

const TTL_MS = 60_000; // 1 min cache
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL || '';

export async function listPredictions(league: string, day: string): Promise<Prediction[]> {
  const key = `preds:${league}:${day}`;
  const cached = await getCache<Prediction[]>(key, TTL_MS);
  if (cached) return cached;

  if (!BASE) return [];

  try {
    const res = await fetch(`${BASE}/predictions?league=${league}&date=${day}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const arr = Array.isArray(json) ? (json as Prediction[]) : [];
    await setCache(key, arr);
    return arr;
  } catch {
    // no mock fallback; just return []
    await setCache(key, []);
    return [];
  }
}
