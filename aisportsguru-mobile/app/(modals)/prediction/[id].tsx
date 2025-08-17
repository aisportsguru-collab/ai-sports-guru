import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getPredictionById, type Prediction } from '../../../src/data/predictions';
import TeamAvatar from '../../../src/components/TeamAvatar';

const { height: H } = Dimensions.get('window');
const SHEET_MAX = Math.min(720, H * 0.88);

export default function PredictionSheet() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const found = id ? await getPredictionById(id) : null;
      if (mounted) { setP(found); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [id]);

  // Tap on the dim backdrop to close
  const close = () => router.back();

  return (
    <View style={styles.screen}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      <View style={styles.sheet}>
        <View style={styles.handleRow}>
          <View style={styles.handle} />
          <Pressable onPress={close} hitSlop={12}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator /></View>
        ) : !p ? (
          <View style={styles.loading}><Text style={{ color: '#fff' }}>Prediction not found.</Text></View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <LinearGradient colors={['#111735', '#1a234a']} style={styles.hero}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TeamAvatar name={p.awayTeam} size={38} />
                <Text style={styles.at}>@</Text>
                <TeamAvatar name={p.homeTeam} size={38} />
              </View>
              <Text style={styles.matchup}>{p.awayTeam} @ {p.homeTeam}</Text>
              <Text style={styles.time}>{new Date(p.startTimeISO).toLocaleString()}</Text>

              <View style={styles.row}>
                <View style={[styles.tag, styles.tagMuted]}><Text style={[styles.tagText, styles.muted]}>{p.league}</Text></View>
                <View style={[styles.tag, styles.tagPick]}><Text style={[styles.tagText, styles.pick]}>{p.pick}</Text></View>
                <View style={[styles.tag, styles.tagValue]}><Text style={[styles.tagText, styles.value]}>+{p.value.toFixed(1)}% EV</Text></View>
                <View style={[styles.tag, styles.tagMuted]}><Text style={[styles.tagText, styles.muted]}>{p.market.toUpperCase()}</Text></View>
              </View>
            </LinearGradient>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>Why this pick</Text>
              <Text style={styles.blockBody}>
                Confidence is {p.confidence}% based on line vs. model edge. Lines history and deeper notes will appear here.
                Pull to refresh the Predictions list for latest updates.
              </Text>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>Responsible use</Text>
              <Text style={styles.blockBody}>
                Predictions are for informational and educational purposes only. No guarantee of outcomes.
                Wager responsibly and within your means.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: SHEET_MAX,
    backgroundColor: '#0b0f2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2a4a',
    overflow: 'hidden',
  },
  handleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  handle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#2b355f' },
  closeText: { color: '#9fb4ff', position: 'absolute', right: 16, top: 2, fontSize: 18 },
  loading: { padding: 24, alignItems: 'center', justifyContent: 'center' },

  hero: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#233055', marginHorizontal: 16, marginTop: 10, marginBottom: 14 },
  matchup: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 8 },
  time: { color: '#d6e1ffb3', marginTop: 4 },
  at: { color: '#98a7ff99', fontWeight: '800', fontSize: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontWeight: '800', fontSize: 12 },
  muted: { color: '#8ea2ff' }, pick: { color: '#95f5bf' }, value: { color: '#ffffffcc' },
  tagMuted: { backgroundColor: '#0f1430', borderColor: '#263259' },
  tagPick: { backgroundColor: 'rgba(63,192,96,0.12)', borderColor: '#3fc060' },
  tagValue: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'transparent' },
  block: { backgroundColor: '#101633', borderRadius: 16, borderWidth: 1, borderColor: '#1f2a4a', padding: 16, marginHorizontal: 16, marginBottom: 14 },
  blockTitle: { color: '#93f7bd', fontWeight: '800', marginBottom: 6 },
  blockBody: { color: '#d6e1ffcc', lineHeight: 20 },
});
