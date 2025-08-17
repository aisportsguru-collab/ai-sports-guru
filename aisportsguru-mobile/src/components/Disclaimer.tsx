import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <Text style={styles.text}>
        Predictions are informational and for educational and entertainment purposes only. 
        No guarantee of outcomes. Wager responsibly and within your means.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  compact: {
    marginTop: 8,
    padding: 8,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFFAA',
  },
});
