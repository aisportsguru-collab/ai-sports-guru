import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import type { LeagueGame } from '../data/leagues';

function fmtTime(iso?: string) {
  try { return new Date(iso ?? '').toLocaleString(); } catch { return ''; }
}

export default function GameRow({ g }: { g: LeagueGame }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.85} onPress={() => router.push(`/prediction/${g.id}`)}>
      <Text style={styles.teams}>{g.awayTeam} @ {g.homeTeam}</Text>
      <Text style={styles.sub}>{fmtTime(g.kickoffISO)}</Text>
      <View style={styles.tags}>
        {!!g.bestMarketLabel && <Text style={styles.tag}>{g.bestMarketLabel} {g.bestMarketLine}</Text>}
        {!!g.bestOddsLabel && <Text style={styles.tag}>{g.bestOddsLabel}</Text>}
        {typeof g.evPercent === 'number' && <Text style={styles.evTag}>{g.evPercent?.toFixed(1)}% EV</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#0b1130', borderRadius: 14, borderWidth: 1, borderColor: '#1b2450', padding: 14 },
  teams: { color: '#fff', fontWeight: '700' },
  sub: { color: '#8fb0ff', fontSize: 12, marginTop: 4 },
  tags: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  tag: { color: '#a8b8ff', fontSize: 12 },
  evTag: { color: '#93f7bd', fontSize: 12, fontWeight: '700' },
});
