import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function GradientBackground({ children, style }: { children?: React.ReactNode; style?: any }) {
  return (
    <LinearGradient colors={['#0b0f2a', '#121a35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bg, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
});
