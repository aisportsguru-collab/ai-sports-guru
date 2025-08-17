import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Purchases, { CustomerInfo } from 'react-native-purchases';

type Props = { entitlementId?: string; fallback?: React.ReactNode; children: React.ReactNode; };

export default function SubscriptionGate({ entitlementId = 'pro', fallback, children }: Props) {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const info = await Purchases.getCustomerInfo();
        if (!mounted) return;
        setActive(!!info.entitlements.active[entitlementId]);
      } catch {
        setActive(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    const sub = Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
      setActive(!!info.entitlements.active[entitlementId]);
    });

    load();

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [entitlementId]);

  if (loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;
  }

  if (!active) {
    return <>{fallback ?? null}</>;
  }

  return <>{children}</>;
}
