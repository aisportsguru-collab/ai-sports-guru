import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { isPro } from '../../../lib/revenuecat';
import { Link } from 'expo-router';

export default function Account() {
  const [info, setInfo] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const i = await Purchases.getCustomerInfo();
      if (alive) setInfo(i);
    })();
    const sub = Purchases.addCustomerInfoUpdateListener(ci => setInfo(ci));
    return () => { alive = false; sub.remove(); };
  }, []);

  const pro = isPro(info);

  return (
    <View style={{ padding: 20, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Account</Text>
      <Text>Status: {pro ? 'Pro ✅' : 'Free'}</Text>

      {!pro && (
        <Link href="/paywall" asChild>
          <Pressable style={{ padding: 12, borderRadius: 10, backgroundColor: '#111' }}>
            <Text style={{ color: 'white', textAlign: 'center' }}>View Paywall</Text>
          </Pressable>
        </Link>
      )}

      <Pressable onPress={() => Purchases.restorePurchases()} style={{ padding: 10 }}>
        <Text>Restore Purchases</Text>
      </Pressable>
    </View>
  );
}
