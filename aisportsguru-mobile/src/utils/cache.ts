import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'asg:';
type Stored<T> = { v: T; t: number; ttl: number };

export async function getCache<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) return null;
  try {
    const { v, t, ttl } = JSON.parse(raw) as Stored<T>;
    if (ttl > 0 && Date.now() - t > ttl) return null;
    return v;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, v: T, ttlMs = 0) {
  const payload: Stored<T> = { v, t: Date.now(), ttl: ttlMs };
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(payload));
}

export async function clearCache(prefix = '') {
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter(k => k.startsWith(PREFIX + prefix));
  if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
}
