import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { getCurrentOffering, isPro } from '../lib/revenuecat';
import { useRouter } from 'expo-router';

export default function Paywall() {
  const [loading, setLoading] = useState(true);
  const [pkgs, setPkgs] = useState<PurchasesPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const offering = await getCurrentOffering();
      if (mounted) setPkgs(offering?.availablePackages ?? []);
      const info = await Purchases.getCustomerInfo();
      if (mounted) setCustomerInfo(info);
      setLoading(false);
    })();
    const sub = Purchases.addCustomerInfoUpdateListener(setCustomerInfo);
    return () => { mounted = false; sub.remove(); };
  }, []);

  const buy = useCallback(async (p: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(p);
      if (isPro(customerInfo)) {
        Alert.alert('Success', 'You are now Pro!');
        router.replace('/(tabs)/account'); // adapt if your tabs group differs
      }
    } catch (e: any) {
      if (e?.userCancelled) return;
      Alert.alert('Purchase failed', String(e?.message ?? e));
    }
  }, []);

  const restore = useCallback(async () => {
    const info = await Purchases.restorePurchases();
    setCustomerInfo(info);
    if (isPro(info)) Alert.alert('Restored', 'Pro restored on this device.');
  }, []);

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator /></View>;

  const alreadyPro = isPro(customerInfo);

  return (
    <View style={{ padding: 20, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Go Pro</Text>
      {alreadyPro && <Text style={{ color: 'green' }}>You already have Pro 🎉</Text>}
      {pkgs.map(p => (
        <Pressable key={p.identifier} onPress={() => buy(p)} style={{ padding: 14, borderRadius: 12, backgroundColor: '#111', opacity: alreadyPro ? 0.5 : 1 }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>{p.packageType}</Text>
          <Text style={{ color: 'white' }}>{p.product.priceString} • {p.product.localizedTitle}</Text>
        </Pressable>
      ))}
      <Pressable onPress={restore} style={{ padding: 10 }}>
        <Text>Restore Purchases</Text>
      </Pressable>
    </View>
  );
}
