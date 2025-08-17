import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@asg:lastdest';

export type LastDest =
  | { type: 'predictions' }
  | { type: 'league'; id: string; label?: string };

export async function getLastDest(): Promise<LastDest | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastDest;
  } catch {
    return null;
  }
}

export async function saveLastDest(dest: LastDest) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(dest));
  } catch {
    // no-op in case storage isn't available
  }
}

export async function clearLastDest() {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}
