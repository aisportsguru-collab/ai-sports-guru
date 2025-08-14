import { Platform } from 'react-native';

const iosKey = process.env.EXPO_PUBLIC_RC_IOS_KEY;
const androidKey = process.env.EXPO_PUBLIC_RC_ANDROID_KEY;

export async function initPurchases(appUserId?: string) {
  // Avoid import errors in Expo Go by dynamic import + guard
  if (!iosKey && !androidKey) return;

  try {
    const Purchases = (await import('react-native-purchases')).default;
    await Purchases.configure({
      apiKey: Platform.select({ ios: iosKey!, android: androidKey! })!,
      appUserID: appUserId || null
    });
  } catch (e) {
    // In Expo Go, this will fail; ignore until dev build
  }
}

export async function getOfferings() {
  try {
    const Purchases = (await import('react-native-purchases')).default;
    return await Purchases.getOfferings();
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: any) {
  const Purchases = (await import('react-native-purchases')).default;
  return await Purchases.purchasePackage(pkg);
}

export async function getCustomerInfo() {
  const Purchases = (await import('react-native-purchases')).default;
  return await Purchases.getCustomerInfo();
}
