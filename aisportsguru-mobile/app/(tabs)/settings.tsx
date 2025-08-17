// app/(tabs)/settings.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { usePro } from '../../src/providers/ProProvider';

export default function Settings() {
  const { refresh } = usePro();
  const [working, setWorking] = useState(false);

  const onRestore = async () => {
    try {
      setWorking(true);
      await refresh('restore');
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center', gap:12 }}>
      <Text style={{ fontSize:22, fontWeight:'700' }}>Settings</Text>
      <Pressable onPress={onRestore} disabled={working}>
        <Text style={{ textDecorationLine:'underline' }}>Restore Purchases</Text>
      </Pressable>
      {working && <ActivityIndicator />}
    </View>
  );
}
