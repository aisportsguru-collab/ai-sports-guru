import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { getCurrentOffering } from '../../lib/revenuecat';

export default function RCCheck() {
  const [out, setOut] = useState<any>(null);
  useEffect(() => { (async () => {
    const off = await getCurrentOffering();
    setOut(off?.availablePackages?.map(p => ({ id: p.identifier, price: p.product.priceString })));
  })(); }, []);
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>RevenueCat Offerings</Text>
      <Text selectable>{JSON.stringify(out, null, 2)}</Text>
    </ScrollView>
  );
}
