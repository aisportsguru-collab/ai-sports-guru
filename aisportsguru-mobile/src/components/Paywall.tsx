// src/components/Paywall.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import { usePro } from '../providers/ProProvider';

export default function Paywall() {
  const router = useRouter();
  const { refresh } = usePro();

  const openSubscribe = () => {
    // CHANGE this route to your real paywall screen if different
    router.push('/paywall');
  };

  const restore = async () => {
    try {
      await Purchases.restorePurchases();
      await refresh(); // re-check entitlement
    } catch (e) {
      console.warn('Restore failed', e);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Pro required</Text>
      <Text style={{ textAlign: 'center', marginBottom: 24 }}>
        Subscribe to unlock all predictions and tools.
      </Text>

      <Pressable
        onPress={openSubscribe}
        style={{ paddingVertical: 14, paddingHorizontal: 22, borderRadius: 10, backgroundColor: '#FFD400', marginBottom: 12 }}
      >
        <Text style={{ fontWeight: '700' }}>See plans</Text>
      </Pressable>

      <Pressable onPress={restore} style={{ padding: 12 }}>
        <Text>Restore purchases</Text>
      </Pressable>
    </View>
  );
}
