import { getCache, setCache } from '../utils/cache';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || '';

export async function apiFetch(path: string) {
  if (!API_BASE) throw new Error('Missing EXPO_PUBLIC_API_BASE_URL');
  const res = await fetch(`${API_BASE}${path}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`API ${path} ${res.status}`);
  return res.json();
}

export async function getOrFetch<T>(key: string, fn: () => Promise<T>, ttlMs = 60_000): Promise<T> {
  const cached = await getCache<T>(key, ttlMs);
  if (cached) return cached;
  const fresh = await fn();
  await setCache(key, fresh);
  return fresh;
}
