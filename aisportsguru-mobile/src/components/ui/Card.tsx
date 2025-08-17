import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function Card({ children, style }: { children?: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
});
