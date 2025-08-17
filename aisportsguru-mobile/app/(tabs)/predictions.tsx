import React from 'react';
import { markPredictions } from '../../src/cta/primary';
import { View, Text, ScrollView, RefreshControl, StyleSheet, SafeAreaView } from 'react-native';
import RequirePro from '../../src/components/RequirePro';
import Disclaimer from '../../src/components/Disclaimer';
import PredictionCard from '../../src/components/PredictionCard';
import { usePredictions } from '../../src/hooks/usePredictions';
import { LinearGradient } from 'expo-linear-gradient';

export default function PredictionsScreen() {
  useEffect(() => { markPredictions(); }, []);

  const { data, loading, error, refresh, refreshing } = usePredictions();

  return (
    <RequirePro>
      <SafeAreaView style={styles.screen}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          {/* Gradient hero */}
          <LinearGradient
            colors={['#111735', '#1a234a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroEyebrow}>Today’s Predictions</Text>
            <Text style={styles.heroTitle}>Fresh picks, all in one place.</Text>
            <Text style={styles.heroSub}>
              We’ll auto-refresh when you open the app. Data layer lands next.
            </Text>
          </LinearGradient>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Skeletons */}
          {loading && !data ? (
            <View>
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={styles.skel} />
              ))}
            </View>
          ) : null}

          {/* List / Empty */}
          {data && data.length > 0 ? (
            <View>
              {data.map((p) => (
                <PredictionCard key={p.id} p={p} />
              ))}
            </View>
          ) : !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No picks right now</Text>
              <Text style={styles.emptySub}>
                When games are live, you’ll see premium predictions here with confidence,
                lines, and value tags.
              </Text>
            </View>
          ) : null}

          <Disclaimer compact />
        </ScrollView>
      </SafeAreaView>
    </RequirePro>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0f2a' },
  content: { padding: 16, paddingBottom: 28 },
  hero: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#233055',
    marginBottom: 14,
  },
  heroEyebrow: { color: '#93f7bd', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  heroSub: { color: '#d6e1ffb3', marginTop: 6, lineHeight: 18 },
  skel: {
    height: 92,
    borderRadius: 16,
    backgroundColor: '#121735',
    borderWidth: 1,
    borderColor: '#1f2a4a',
    opacity: 0.6,
    marginBottom: 12,
  },
  empty: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#101633',
    borderWidth: 1,
    borderColor: '#1f2a4a',
    marginBottom: 14,
  },
  emptyTitle: { color: '#93f7bd', fontWeight: '800' },
  emptySub: { color: '#d6e1ffcc', marginTop: 6, lineHeight: 18 },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#2a1120',
    borderWidth: 1,
    borderColor: '#5f1b3d',
    marginBottom: 12,
  },
  errorText: { color: '#ff8aa0', textAlign: 'center' },
});
/* --- remember last predictions route --- */
import { useEffect } from 'react';
import { remember, MEM_LAST_PRED_ROUTE } from '../../src/lib/memory';

useEffect(() => {
  remember(MEM_LAST_PRED_ROUTE, '/(tabs)/predictions').catch(() => {});
}, []);
/* --- end remember route --- */

/** Mount side-effect: remember Predictions as last spot when viewed */
(function useRememberPredictionsOnce(){
  // defend against multiple evals in fast refresh by using a module-level flag if needed
  let did = false;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (did) return;
    did = true;
  }, []);
})();
