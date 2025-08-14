import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { configureRevenueCat } from '../lib/revenuecat';

export default function RootLayout() {
  useEffect(() => {
    configureRevenueCat();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
