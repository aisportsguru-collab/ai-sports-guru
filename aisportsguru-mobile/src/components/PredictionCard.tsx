import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Prediction } from '../data/predictions';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import TeamAvatar from './TeamAvatar';

function chipColors(confidence: number): [string, string] {
  if (confidence >= 75) return ['#34d399', '#10b981'];
  if (confidence >= 60) return ['#fbbf24', '#f59e0b'];
  return ['#fb7185', '#ef4444'];
}

export default function PredictionCard({ p }: { p: Prediction }) {
  const router = useRouter();
  const [c1, c2] = chipColors(p.confidence);
  const startTime = new Date(p.startTimeISO).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={async () => {
        try { await Haptics.selectionAsync(); } catch {}
        router.push(`/(modals)/prediction/${encodeURIComponent(p.id)}`);
      }}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.league}>{p.league}</Text>
          <TeamAvatar name={p.awayTeam} />
          <TeamAvatar name={p.homeTeam} />
        </View>
        <LinearGradient colors={[c1, c2]} style={styles.confChip}>
          <Text style={styles.confText}>{p.confidence}%</Text>
        </LinearGradient>
      </View>

      <Text style={styles.matchup}>
        {p.awayTeam} <Text style={styles.at}>@</Text> {p.homeTeam}
      </Text>
      <Text style={styles.time}>{startTime}</Text>

      <View style={styles.row}>
        <View style={[styles.tag, styles.tagMuted]}>
          <Text style={[styles.tagText, styles.tagTextMuted]}>{p.market.toUpperCase()}</Text>
        </View>
        <View style={[styles.tag, styles.tagPick]}>
          <Text style={[styles.tagText, styles.tagTextPick]}>{p.pick}</Text>
        </View>
        <View style={[styles.tag, styles.tagValue]}>
          <Text style={[styles.tagText, styles.tagTextValue]}>+{p.value.toFixed(1)}% EV</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111736',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2a4a',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  league: { color: '#98a7ffcc', fontSize: 12, letterSpacing: 0.4 },
  confChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  confText: { color: '#0b0f1a', fontWeight: '800', fontSize: 12 },
  matchup: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 6 },
  at: { color: '#98a7ff99', fontWeight: '700' },
  time: { color: '#c9d4ff99', marginTop: 2, fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },

  tag: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontWeight: '800', fontSize: 12 },

  tagMuted: { backgroundColor: '#0f1430', borderColor: '#263259' },
  tagTextMuted: { color: '#8ea2ff' },

  tagPick: { backgroundColor: 'rgba(63,192,96,0.12)', borderColor: '#3fc060' },
  tagTextPick: { color: '#95f5bf' },

  tagValue: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'transparent' },
  tagTextValue: { color: '#ffffffcc' },
});
