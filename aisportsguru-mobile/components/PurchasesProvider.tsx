import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { CustomerInfo, Offerings, PurchasesPackage } from 'react-native-purchases';
import { supabase } from '../lib/supabase';

type Ctx = {
  customerInfo: CustomerInfo | null;
  offerings: Offerings | null;
  hasPro: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
};

const PurchasesCtx = createContext<Ctx>({
  customerInfo: null,
  offerings: null,
  hasPro: false,
  purchase: async () => {},
  restore: async () => {},
  refresh: async () => {},
});

export function usePurchases() { return useContext(PurchasesCtx); }

export const PurchasesProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<Offerings | null>(null);

  // Configure SDK
  useEffect(() => {
    const key = Platform.select({
      ios: process.env.EXPO_PUBLIC_RC_API_KEY_IOS,
      android: process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID,
    })!;
    Purchases.setLogLevel(__DEV__ ? 'DEBUG' : 'WARN');
    Purchases.configure({ apiKey: key });
    (async () => {
      const info = await Purchases.getCustomerInfo().catch(() => null);
      if (info) setCustomerInfo(info);
      const offs = await Purchases.getOfferings().catch(() => null);
      if (offs) setOfferings(offs);
    })();
  }, []);

  // Tie identity to Supabase auth
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) {
        const u = session.user;
        await Purchases.logIn(u.id).catch(() => {});
        await Purchases.setAttributes({
          email: u.email ?? '',
          $displayName: (u.user_metadata?.full_name || '').toString(),
        }).catch(() => {});
      } else {
        await Purchases.logOut().catch(() => {});
      }
      setCustomerInfo(await Purchases.getCustomerInfo().catch(() => null));
    });
    return () => { sub.data.subscription?.unsubscribe(); };
  }, []);

  const hasPro = useMemo(() => {
    const ents = customerInfo?.entitlements?.active ?? {};
    // Name your entitlement in RevenueCat as "pro" (Paywalls → Entitlements)
    return !!ents['pro'];
  }, [customerInfo]);

  const refresh = async () => {
    const [info, offs] = await Promise.all([
      Purchases.getCustomerInfo().catch(() => null),
      Purchases.getOfferings().catch(() => null),
    ]);
    if (info) setCustomerInfo(info);
    if (offs) setOfferings(offs);
  };

  const purchase = async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      if (info.entitlements.active['pro']) {
        Alert.alert('Success', 'Subscription activated!');
      }
    } catch (e: any) {
      if (e?.userCancelled) return;
      Alert.alert('Purchase failed', e?.message ?? 'Unknown error');
    }
  };

  const restore = async () => {
    const info = await Purchases.restorePurchases().catch(() => null);
    if (info) setCustomerInfo(info);
  };

  return (
    <PurchasesCtx.Provider value={{ customerInfo, offerings, hasPro, purchase, restore, refresh }}>
      {children}
    </PurchasesCtx.Provider>
  );
};
