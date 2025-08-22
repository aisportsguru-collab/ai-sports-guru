import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function LeagueIndex() {
  const router = useRouter();

  useEffect(() => {
    // Default league if none specified
    router.replace('/(tabs)/league/nfl');
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0f2a', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#93f7bd" />
    </View>
  );
}
