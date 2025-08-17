import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function palette(n: number): [string, string] {
  const colors = [
    ['#4f46e5', '#22d3ee'],
    ['#10b981', '#84cc16'],
    ['#e11d48', '#f97316'],
    ['#06b6d4', '#6366f1'],
    ['#f59e0b', '#f43f5e'],
  ];
  return colors[n % colors.length] as [string, string];
}
function initials(name: string) {
  const parts = name.split(/\s|-/).filter(Boolean);
  const s = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return s.toUpperCase().slice(0, 2) || '?';
}

export default function TeamAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const [c1, c2] = palette(hash(name));
  return (
    <LinearGradient colors={[c1, c2]} style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[styles.inner, { borderRadius: size / 2 - 2 }]}>
        <Text style={[styles.text, { fontSize: Math.max(12, size * 0.42) }]}>{initials(name)}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center', padding: 2 },
  inner: { flex: 1, backgroundColor: '#0b0f2a', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '800' },
});
