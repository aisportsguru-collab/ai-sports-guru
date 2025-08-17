import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import Purchases, { CustomerInfo, Offerings } from 'react-native-purchases';
import * as Application from 'expo-application';

function Row({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{String(value ?? '')}</Text>
    </View>
  );
}

export default function RCDiagnostics() {
  const [appUserId, setAppUserId] = useState<string>('');
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const uid = await Purchases.getAppUserID();
        setAppUserId(uid);
      } catch (e: any) {
        setError(`getAppUserID: ${e?.message}`);
      }

      try {
        const info = await Purchases.getCustomerInfo();
        setCustomer(info);
      } catch (e: any) {
        setError(prev => (prev ? prev + ' | ' : '') + `getCustomerInfo: ${e?.message}`);
      }

      try {
        const off = await Purchases.getOfferings();
        setOfferings(off);
      } catch (e: any) {
        setError(prev => (prev ? prev + ' | ' : '') + `getOfferings: ${e?.message}`);
      }
    })();
  }, []);

  const activeEntitlements = customer ? Object.keys(customer.entitlements.active || {}) : [];
  const currentOffering = offerings?.current?.identifier ?? null;
  const pkgIds = offerings?.current?.availablePackages?.map(p => p.identifier).join(', ') ?? '';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>RevenueCat Diagnostics</Text>

      <Row label="Bundle Identifier" value={Application.applicationId} />
      <Row label="App Version" value={`${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`} />
      <Row label="RC App User ID" value={appUserId} />
      <Row label="Active Entitlements" value={activeEntitlements.join(', ') || 'none'} />
      <Row label="Current Offering" value={currentOffering || 'null'} />
      <Row label="Packages in Offering" value={pkgIds || 'none'} />
      <Row label="Error" value={error || 'none'} />

      <Text style={styles.note}>
        Tip: Bundle identifier must match the one configured in App Store Connect and in your RevenueCat project.
        Offerings should list your monthly/yearly package ids. If they are empty here, RC can’t see your products for this bundle id.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#0b0f2a', flexGrow: 1 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  row: { marginBottom: 10 },
  label: { color: '#A0F3BD', fontWeight: '700', marginBottom: 2, fontSize: 12 },
  value: { color: '#FFFFFFCC', fontSize: 14 },
  note: { color: '#FFFFFF88', fontSize: 12, marginTop: 20, lineHeight: 18 },
});
