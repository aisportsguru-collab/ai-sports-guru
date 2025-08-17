import AsyncStorage from '@react-native-async-storage/async-storage';

type CacheEntry<T> = { ts: number; data: T };

const mem = new Map<string, CacheEntry<any>>();
const NS = 'asg:v1:';

export async function getCache<T>(key: string, ttlMs: number): Promise<T | null> {
  const now = Date.now();
  const k = NS + key;

  // in-memory first
  const m = mem.get(k);
  if (m && now - m.ts < ttlMs) return m.data as T;

  // disk next
  try {
    const raw = await AsyncStorage.getItem(k);
    if (!raw) return null;
    const parsed: CacheEntry<T> = JSON.parse(raw);
    if (now - parsed.ts < ttlMs) {
      mem.set(k, parsed);
      return parsed.data;
    }
  } catch {}
  return null;
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  const k = NS + key;
  const entry: CacheEntry<T> = { ts: Date.now(), data };
  mem.set(k, entry);
  try {
    await AsyncStorage.setItem(k, JSON.stringify(entry));
  } catch {}
}

export async function clearCache(keyPrefix = ''): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter(k => k.startsWith(NS + keyPrefix));
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch {}
  // also clear memory
  for (const k of Array.from(mem.keys())) {
    if (k.startsWith(NS + keyPrefix)) mem.delete(k);
  }
}
