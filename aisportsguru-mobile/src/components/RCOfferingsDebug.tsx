import React, { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import Purchases from 'react-native-purchases';

export default function RCOfferingsDebug() {
  const [dump, setDump] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const offs = await Purchases.getOfferings();
        const prods = await Purchases.getProducts([
          'com.aisportsguru.pro.monthly',
          'com.aisportsguru.pro.yearly',
        ]);
        setDump(JSON.stringify({
          hasCurrent: !!offs.current,
          packages: offs.current?.availablePackages?.map((p) => ({
            pkg: p.identifier, storeId: p.product.identifier, price: p.product.priceString,
          })),
          fallbackProducts: prods.map((p) => ({ id: p.identifier, price: p.priceString })),
        }, null, 2));
      } catch (e: any) {
        setDump('err: ' + (e?.message || String(e)));
      }
    })();
  }, []);
  return (
    <ScrollView style={{ maxHeight: 220, backgroundColor: '#111827', margin: 16, borderRadius: 12, padding: 12 }}>
      <Text style={{ color: '#93c5fd', fontFamily: 'Courier' }}>{dump}</Text>
    </ScrollView>
  );
}
