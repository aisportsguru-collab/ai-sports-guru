import AsyncStorage from '@react-native-async-storage/async-storage';

export async function setJSON<T>(key: string, value: T): Promise<void> {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
