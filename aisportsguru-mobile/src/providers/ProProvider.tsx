import React, { createContext, useContext, useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';

const FORCE_PRO = String(process.env.EXPO_PUBLIC_FORCE_PRO || '').toLowerCase() === 'true';

type Ctx = { isPro: boolean; loading: boolean };
const ProCtx = createContext<Ctx>({ isPro: false, loading: true });
export const usePro = () => useContext(ProCtx);

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(FORCE_PRO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (FORCE_PRO) { setLoading(false); return; }
    (async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        const active = info.entitlements.active;
        setIsPro(!!(active && (active['pro'] || active['default'])));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return <ProCtx.Provider value={{ isPro, loading }}>{children}</ProCtx.Provider>;
}
