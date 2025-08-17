import AsyncStorage from '@react-native-async-storage/async-storage';

const K_LAST_LEAGUE = 'asg:last-league';
const K_LAST_WAS_PRED = 'asg:last-was-predictions';

/** Mark that user opened Predictions last. */
export async function rememberPredictions() {
  try {
    await AsyncStorage.multiSet([[K_LAST_WAS_PRED, '1']]);
  } catch {}
}

/** Mark that user viewed a league last. */
export async function rememberLeague(id: string) {
  try {
    await AsyncStorage.multiSet([
      [K_LAST_LEAGUE, id || ''],
      [K_LAST_WAS_PRED, '0'],
    ]);
  } catch {}
}

/** Decide where to land on app start. Returns a route string (or null). */
export async function continueFromMemory(): Promise<string | null> {
  try {
    const [[, lastLeague], [, lastWasPred]] = await AsyncStorage.multiGet([
      K_LAST_LEAGUE,
      K_LAST_WAS_PRED,
    ]);

    if (lastWasPred === '1') return '/predictions';
    if (lastLeague) return `/league/${encodeURIComponent(lastLeague)}`;
  } catch {}

  return null; // index gate will route to /home
}
