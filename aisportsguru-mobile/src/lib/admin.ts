export type Entitlement = { loading: boolean; hasPro: boolean };

/**
 * Dev stub. Replace with your real RevenueCat/IAP logic later.
 * When EXPO_PUBLIC_DISABLE_PAYWALL="1" we always allow access.
 */
export function useEntitlement(): Entitlement {
  const disabled = process.env.EXPO_PUBLIC_DISABLE_PAYWALL === "1";
  return { loading: false, hasPro: disabled ? true : true };
}
