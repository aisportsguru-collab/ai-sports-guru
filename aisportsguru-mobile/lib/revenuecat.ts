import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo, PurchasesOffering } from 'react-native-purchases';

export const configureRevenueCat = async () => {
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_RC_API_KEY_IOS
      : process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID;

  if (!apiKey) {
    console.warn('RevenueCat API key missing for platform:', Platform.OS);
    return;
  }
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  await Purchases.configure({ apiKey });
};

export const isPro = (info: CustomerInfo | null) =>
  !!info?.entitlements?.active?.pro;

export const getCurrentOffering = async (): Promise<PurchasesOffering | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    console.warn('getOfferings failed', e);
    return null;
  }
};
