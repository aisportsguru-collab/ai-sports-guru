import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItemJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setItemJSON<T>(key: string, val: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(val));
  } catch {}
}
