// src/components/Paywall.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import { usePro } from '../providers/ProProvider';

export default function Paywall(){
  if (process.env.EXPO_PUBLIC_DISABLE_PAYWALL === "1") { const { Redirect } = require("expo-router"); return <Redirect href="/(tabs)/sports" />; }
  if (process.env.EXPO_PUBLIC_DISABLE_PAYWALL === "1") { const { Redirect } = require("expo-router"); return <Redirect href="/(tabs)/sports" />; }
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
