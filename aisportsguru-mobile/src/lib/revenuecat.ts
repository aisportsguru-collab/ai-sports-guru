// src/lib/revenuecat.ts
import type { CustomerInfo } from 'react-native-purchases';

export const ENTITLEMENT_ID = 'pro';

export function isPro(info?: CustomerInfo | null) {
  return !!info?.entitlements?.active?.[ENTITLEMENT_ID];
}
