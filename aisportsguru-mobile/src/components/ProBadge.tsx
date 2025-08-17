// src/components/ProBadge.tsx
import React from 'react';
import { Text, View } from 'react-native';

export default function ProBadge() {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#FFD400',
      }}
    >
      <Text style={{ fontWeight: '700' }}>PRO</Text>
    </View>
  );
}
