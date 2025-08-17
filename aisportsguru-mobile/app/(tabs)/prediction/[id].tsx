import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cachedJSON } from '../../../src/data/api';

type Pred = {
  id: string;
  title?: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  market?: string;
  line?: string;
  odds?: string;
  evPercent?: number;
  writeup?: string;
};

export default function PredictionModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [pred, setPred] = useState<Pred | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const p = await cachedJSON<Pred>(`pred:${id}`, `/v1/predictions/${id}`, 60 * 60_000, async () => ({
          id: String(id), title: 'Sample Pick', league: 'NBA', homeTeam: 'Celtics', awayTeam: 'Knicks',
          market: 'Over', line: '221.5', odds: '+108', evPercent: 3.8, writeup: 'Model edge based on pace and shooting.'
        }));
        if (alive) setPred(p);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading || !pred) return <View style={styles.loading}><ActivityIndicator color="#93f7bd" /></View>;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={() => router.back()} style={styles.close}><Text style={{color:'#8fb0ff'}}>Close</Text></TouchableOpacity>
      <Text style={styles.title}>{pred.awayTeam} @ {pred.homeTeam}</Text>
      <Text style={styles.sub}>{pred.league} • {pred.market} {pred.line} • {pred.odds} • {pred.evPercent?.toFixed(1)}% EV</Text>
      {!!pred.writeup && <Text style={styles.body}>{pred.writeup}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  wrap: { flex: 1, backgroundColor: '#0b0f2a', padding: 16 },
  close: { alignSelf: 'flex-end', padding: 8 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 8 },
  sub: { color: '#8fb0ff', fontSize: 12, marginTop: 6 },
  body: { color: '#d7e1ff', fontSize: 14, marginTop: 12, lineHeight: 20 },
});
