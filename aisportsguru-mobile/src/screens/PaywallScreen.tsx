import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import Purchases, { PurchasesPackage, PurchasesProduct, CustomerInfo, Offerings } from 'react-native-purchases';

const MONTHLY_ID = 'com.aisportsguru.pro.monthly';
const YEARLY_ID  = 'com.aisportsguru.pro.yearly';
const ENTITLEMENT_ID = 'pro';

export default function PaywallScreen() {
  const [loading, setLoading] = useState(true);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [products, setProducts] = useState<PurchasesProduct[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);

  const refreshCustomer = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomer(info);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const offs = await Purchases.getOfferings();
      setOfferings(offs);
      const pkgs = offs.current?.availablePackages ?? [];
      setPackages(pkgs);
      if (pkgs.length === 0) {
        // Fallback to direct products (simulator or before ASC approval)
        const prods = await Purchases.getProducts([MONTHLY_ID, YEARLY_ID]);
        setProducts(prods);
      } else {
        setProducts([]); // we have packages, no need to show products
      }
    } catch (e: any) {
      setErrorMessage(
        'There is an issue with your configuration. Check the underlying error for more details. ' +
        (e?.message ?? String(e))
      );
      // Still try to fetch direct products so dev can proceed
      try {
        const prods = await Purchases.getProducts([MONTHLY_ID, YEARLY_ID]);
        setProducts(prods);
      } catch {}
    } finally {
      setLoading(false);
      refreshCustomer();
    }
  }, [refreshCustomer]);

  useEffect(() => {
    const sub = Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
      setCustomer(info);
    });
    load();
    return () => { sub.remove(); };
  }, [load]);

  const buyPackage = async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setCustomer(customerInfo);
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        Alert.alert('Success', 'You are now Pro!');
      }
    } catch (e: any) {
      if (!(e && e.userCancelled)) {
        Alert.alert('Purchase failed', e?.message ?? String(e));
      }
    }
  };

  const buyProduct = async (product: PurchasesProduct) => {
    try {
      const { customerInfo } = await Purchases.purchaseProduct(product.identifier);
      setCustomer(customerInfo);
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        Alert.alert('Success', 'You are now Pro!');
      }
    } catch (e: any) {
      if (!(e && e.userCancelled)) {
        Alert.alert('Purchase failed', e?.message ?? String(e));
      }
    }
  };

  const restore = async () => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomer(info);
      if (info.entitlements.active[ENTITLEMENT_ID]) {
        Alert.alert('Restored', 'Your Pro access has been restored.');
      } else {
        Alert.alert('No purchases found', 'We could not find any active subscriptions for this account.');
      }
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? String(e));
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B0B0F', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const activeEnt = customer?.entitlements.active[ENTITLEMENT_ID];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0B0B0F' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', marginBottom: 8 }}>Go Pro</Text>
      <Text style={{ color: '#cbd5e1', marginBottom: 16 }}>
        Unlock all predictions, confidence ratings, and premium features.
      </Text>

      {activeEnt ? (
        <View style={{ backgroundColor: '#0f766e', padding: 12, borderRadius: 12, marginBottom: 16 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>✅ You already have Pro</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={{ backgroundColor: '#1f2937', padding: 12, borderRadius: 12, marginBottom: 16 }}>
          <Text style={{ color: '#fda4af' }}>{errorMessage}</Text>
          <Text style={{ color: '#cbd5e1', marginTop: 8 }}>
            Tip for dev, open Xcode scheme, attach StoreKit.storekit.{'\n'}
            Tip for QA, use a promotional entitlement on your App User ID.
          </Text>
        </View>
      ) : null}

      {/* Show RevenueCat packages if available */}
      {packages.map((pkg) => (
        <View key={pkg.identifier} style={{ backgroundColor: '#111827', padding: 16, borderRadius: 16, marginBottom: 12 }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>
            {pkg.product.title || (pkg.packageType === 'MONTHLY' ? 'Monthly' : pkg.packageType === 'ANNUAL' ? 'Yearly' : pkg.identifier)}
          </Text>
          <Text style={{ color: '#93c5fd', marginTop: 6 }}>
            {pkg.product.priceString} {pkg.packageType === 'ANNUAL' ? 'per year' : 'per month'}
          </Text>
          <Pressable onPress={() => buyPackage(pkg)} style={{ marginTop: 12, backgroundColor: '#FFD700', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: '#0b0b0f', fontWeight: '800' }}>Subscribe</Text>
          </Pressable>
        </View>
      ))}

      {/* Fallback to direct products (simulator / pre-ASC-approval) */}
      {packages.length === 0 && products.map((p) => (
        <View key={p.identifier} style={{ backgroundColor: '#111827', padding: 16, borderRadius: 16, marginBottom: 12 }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>
            {p.identifier === MONTHLY_ID ? 'Monthly' : p.identifier === YEARLY_ID ? 'Yearly' : p.title || p.identifier}
          </Text>
          <Text style={{ color: '#93c5fd', marginTop: 6 }}>
            {p.priceString} {p.identifier === YEARLY_ID ? 'per year' : 'per month'}
          </Text>
          <Pressable onPress={() => buyProduct(p)} style={{ marginTop: 12, backgroundColor: '#FFD700', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: '#0b0b0f', fontWeight: '800' }}>Subscribe</Text>
          </Pressable>
        </View>
      ))}

      <Pressable onPress={restore} style={{ marginTop: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155', alignItems: 'center' }}>
        <Text style={{ color: '#cbd5e1' }}>Restore Purchases</Text>
      </Pressable>

      {/* tiny debug footer */}
      <View style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 12, marginTop: 16 }}>
        <Text style={{ color: '#94a3b8', fontSize: 12 }}>
          packages={packages.length} products={products.map(p => `${p.identifier}:${p.priceString}`).join(' | ') || 'none'}
        </Text>
      </View>
    </ScrollView>
  );
}
