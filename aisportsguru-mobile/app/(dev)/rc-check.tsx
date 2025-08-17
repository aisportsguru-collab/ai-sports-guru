import * as React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Purchases from 'react-native-purchases';

export default function RCCheck() {
  const [appUserId, setAppUserId] = React.useState<string>('');
  const [activeEntitlements, setActiveEntitlements] = React.useState<string[]>([]);
  const [isPro, setIsPro] = React.useState<boolean>(false);
  const [offerings, setOfferings] = React.useState<any>(null);
  const [err, setErr] = React.useState<string>('');

  React.useEffect(() => {
    (async () => {
      try {
        const id = await Purchases.getAppUserID();
        setAppUserId(id);

        const info = await Purchases.getCustomerInfo();
        const active = Object.keys(info?.entitlements?.active ?? {});
        setActiveEntitlements(active);
        setIsPro(active.includes('pro'));

        try {
          const offs = await Purchases.getOfferings();
          setOfferings(offs);
        } catch (e: any) {
          setOfferings(null);
          setErr(String(e?.message || e));
        }
      } catch (e: any) {
        setErr(String(e?.message || e));
      }
    })();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
        RevenueCat Check
      </Text>

      <Text style={{ marginBottom: 8 }}>App User ID:</Text>
      <View style={{ backgroundColor: '#111', padding: 12, borderRadius: 8, marginBottom: 12 }}>
        <Text style={{ color: '#fff' }}>{appUserId || '(loading...)'}</Text>
      </View>

      <Text style={{ marginBottom: 8 }}>Active Entitlements:</Text>
      <View style={{ backgroundColor: '#111', padding: 12, borderRadius: 8, marginBottom: 12 }}>
        <Text style={{ color: '#fff' }}>{JSON.stringify(activeEntitlements)}</Text>
      </View>

      <Text style={{ fontWeight: '700', marginBottom: 8 }}>
        isPro: {String(isPro)}
      </Text>

      <Text style={{ marginTop: 16, marginBottom: 8 }}>Offerings (may be empty in dev):</Text>
      <View style={{ backgroundColor: '#111', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: '#fff' }}>
          {offerings ? JSON.stringify(offerings, null, 2) : '(none)'}
        </Text>
      </View>

      {err ? (
        <Text style={{ color: 'red', marginTop: 12 }}>Error: {err}</Text>
      ) : null}

      <Text style={{ marginTop: 16 }}>
        Deep link: <Text style={{ fontWeight: '700' }}>aisportsguru://(dev)/rc-check</Text>
      </Text>
    </ScrollView>
  );
}
