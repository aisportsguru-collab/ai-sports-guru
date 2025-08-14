import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (sportKey: string) => `fav:${sportKey}`;

export async function loadFavorites(sportKey: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key(sportKey));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr.map(s => s.toLowerCase()));
  } catch {
    return new Set();
  }
}

export async function saveFavorites(sportKey: string, set: Set<string>) {
  try {
    await AsyncStorage.setItem(key(sportKey), JSON.stringify(Array.from(set)));
  } catch {}
}

export async function toggleFavorite(sportKey: string, set: Set<string>, teams: string[]): Promise<Set<string>> {
  const next = new Set(set);
  for (const t of teams) {
    const k = (t || '').toLowerCase();
    if (next.has(k)) next.delete(k); else next.add(k);
  }
  await saveFavorites(sportKey, next);
  return next;
}
