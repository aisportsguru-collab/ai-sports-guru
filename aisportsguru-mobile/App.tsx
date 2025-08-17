import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native';
import { configurePurchases } from './src/lib/purchases';
import PaywallScreen from './src/screens/PaywallScreen';

const RC_APP_USER_ID = process.env.RC_APP_USER_ID || "$RCAnonymousID:2a8617d150e946fcb7d27693cd921e02";

export default function App() {
  useEffect(() => {
    configurePurchases(RC_APP_USER_ID);
  }, []);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0F' }}>
      <PaywallScreen />
    </SafeAreaView>
  );
}
