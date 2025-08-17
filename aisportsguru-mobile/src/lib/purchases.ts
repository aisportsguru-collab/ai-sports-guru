import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

let configured = false;

/** Idempotent: configures Purchases once per app run. */
export async function ensurePurchasesConfigured() {
  if (configured) return;
  const iosKey = process.env.EXPO_PUBLIC_RC_API_KEY_IOS || '';
  const androidKey = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID || '';
  const apiKey = Platform.select({ ios: iosKey, android: androidKey }) || '';
  if (!apiKey) {
    if (__DEV__) console.warn('[RC] Missing API key env (EXPO_PUBLIC_RC_API_KEY_*)');
    return;
  }
  await Purchases.configure({ apiKey });
  configured = true;
  if (__DEV__) {
    try {
      const uid = await Purchases.getAppUserID();
      console.log('[RC] configured. key:', apiKey.slice(0,6)+'…', 'user:', uid);
    } catch {}
  }
}
