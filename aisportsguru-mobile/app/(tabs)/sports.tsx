import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { LEAGUES } from '../../src/constants/leagues';

export default function SportsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0b0f2a' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Browse Sports</Text>

      <View style={styles.list}>
        {LEAGUES.map((l) => (
          <TouchableOpacity
            key={l.id}
            onPress={() => router.push(`/league/${encodeURIComponent(l.id)}`)}
            style={styles.row}
            activeOpacity={0.85}
          >
            <View style={styles.iconWrap}><Ionicons name="trophy-outline" size={16} color="#93f7bd" /></View>
            <Text style={styles.rowText}>{l.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#8fb0ff" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b1130',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1b2450',
    padding: 14,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(63,192,96,0.12)', marginRight: 10,
  },
  rowText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
