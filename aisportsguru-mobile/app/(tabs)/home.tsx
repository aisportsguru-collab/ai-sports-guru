import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { onPrimaryCTAPress } from '../../src/cta/primary';
import { LEAGUES } from '../../src/constants/leagues';
import { labelForLeague } from '../../src/utils/labels';

export default function Home() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        bounces
      >
        {/* upper content */}
        <View style={styles.upper}>
          {/* hero */}
          <View style={styles.hero}>
            <Text style={styles.heroKicker}>AI Sports Guru</Text>
            <Text style={styles.heroTitle}>Premium predictions, beautiful experience.</Text>

            <TouchableOpacity style={styles.cta} onPress={onPrimaryCTAPress} activeOpacity={0.9}>
              <Text style={styles.ctaText}>Go to Predictions</Text>
            </TouchableOpacity>

            {/* chips */}
            <View style={styles.chipsRow}>
              {LEAGUES.map((l) => (
                <TouchableOpacity
                  key={l.id}
                  style={styles.chip}
                  onPress={() => router.push(`/(tabs)/league/${l.id}`)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.chipText}>{l.label ?? labelForLeague(l.id)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* cards */}
          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Follow Teams</Text>
              <Text style={styles.cardSub}>Personalize predictions by the teams you care about.</Text>
              <Text style={styles.link} onPress={() => router.push('/(tabs)/account/index?focus=teams')}>
                Choose teams →
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Daily Digest</Text>
              <Text style={styles.cardSub}>Get a morning snapshot of picks, odds moves, and lines.</Text>
              <Text style={styles.link} onPress={() => router.push('/(tabs)/settings?focus=digest')}>
                Set up digest →
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account</Text>
              <Text style={styles.cardSub}>Manage subscription, profile, and devices.</Text>
              <Text style={styles.link} onPress={() => router.push('/(tabs)/account/index')}>
                Open Account →
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Settings</Text>
              <Text style={styles.cardSub}>Restore purchases, preferences, theme.</Text>
              <Text style={styles.link} onPress={() => router.push('/(tabs)/settings')}>
                Open Settings →
              </Text>
            </View>
          </View>
        </View>

        {/* legal pinned at bottom, visible above tab bar */}
        <View style={styles.legal}>
          <Text style={styles.legalText}>
            By using this app you agree to our{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/terms')}>Terms</Text>,{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/privacy')}>Privacy</Text>, and{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/responsible-gaming')}>
              Responsible Gaming
            </Text>.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0b0f2a',
  },
  scroll: {
    flexGrow: 1,
    minHeight: '100%',
    paddingHorizontal: 16,
    paddingTop: 10,     // small space at top
    paddingBottom: 80,  // enough room so legal sits ABOVE the tab bar
  },

  upper: { gap: 12 },

  hero: {
    backgroundColor: '#0b1130',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1b2450',
    padding: 16,
  },
  heroKicker: { color: '#8fb0ff', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  heroTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800', marginBottom: 12 },

  cta: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2cd26b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ctaText: { color: '#0b0f2a', fontWeight: '800', fontSize: 16 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#263259',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(63,192,96,0.12)',
  },
  chipText: { color: '#a8b8ff', fontSize: 12, fontWeight: '700' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 10,
  },
  card: {
    width: '48%',
    backgroundColor: '#0b1130',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1b2450',
    padding: 12,
  },
  cardTitle: { color: '#fff', fontWeight: '800', marginBottom: 6 },
  cardSub: { color: '#8fb0ff', fontSize: 12, marginBottom: 6 },
  link: { color: '#a8b8ff', textDecorationLine: 'underline', fontSize: 12 },

  legal: {
    marginTop: 'auto',  // pushes this block to the bottom of the screen
  },
  legalText: {
    color: '#8ba0b2',
    fontSize: 12,
    textAlign: 'center',
  },
  legalLink: {
    color: '#a8b8ff',
    textDecorationLine: 'underline',
  },
});
