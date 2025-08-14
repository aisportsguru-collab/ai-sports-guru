type Sport = {
  key: string;
  name: string;
  // extend as needed
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000/api';

type CacheEntry<T> = { at: number; data: T };
const mem: Record<string, CacheEntry<any>> = {};

export async function cachedFetch<T>(key: string, url: string, ttlMs = 60_000): Promise<T> {
  const now = Date.now();
  const hit = mem[key];
  if (hit && now - hit.at < ttlMs) return hit.data as T;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as T;
  mem[key] = { at: now, data };
  return data;
}

/** Predictions from your cached API (no direct Odds API hits) */
export async function getPredictions(sport: string, daysFrom = 0) {
  const url = `${API_BASE}/predictions/${encodeURIComponent(sport)}?daysFrom=${daysFrom}`;
  return cachedFetch<any>(`pred:${sport}:${daysFrom}`, url, 60_000);
}

/** List of sports — you can adapt to your backend route if different */
export async function getSportsList() {
  const url = `${API_BASE}/predictions/sports`; // create server alias if needed
  return cachedFetch<Sport[]>(`sports:list`, url, 60_000);
}
