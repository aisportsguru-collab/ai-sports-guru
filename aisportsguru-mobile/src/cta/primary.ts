import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const KEY = 'app:last:spot';

type LastSpot =
  | { type: 'predictions' }
  | { type: 'league'; id: string };

async function getLastSpot(): Promise<LastSpot | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const val = JSON.parse(raw);
    if (val?.type === 'predictions') return { type: 'predictions' };
    if (val?.type === 'league' && typeof val.id === 'string') {
      return { type: 'league', id: String(val.id).toLowerCase() };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setLastSpot(spot: LastSpot) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(spot));
  } catch {}
}

/** Call this from the Home CTA. Falls back to Predictions if nothing saved. */
export async function onPrimaryCTAPress() {
  const last = await getLastSpot();
  if (last?.type === 'league') {
    router.push(`/(tabs)/league/${last.id}`);
    return;
  }
  router.push('/(tabs)/predictions');
}

/** Optional helpers you can use inside screens */
export async function markPredictions() {
  await setLastSpot({ type: 'predictions' });
}
export async function markLeague(id: string) {
  await setLastSpot({ type: 'league', id: id.toLowerCase() });
}
