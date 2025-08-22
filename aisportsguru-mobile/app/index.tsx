import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet } from 'react-native';

const GOLD = '#D4AF37';
const BLACK = '#0B0B0B';
const WHITE = '#FFFFFF';

export default function Landing() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BLACK }} edges={['top', 'bottom']}>
      <View style={styles.wrap}>
        <View style={styles.haloWrap} pointerEvents="none">
          <LinearGradient
            colors={['rgba(212,175,55,0.12)', 'rgba(212,175,55,0.02)', 'transparent']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.halo}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>AI Sports Guru</Text>
          <Text style={styles.sub}>
            Premium, model-driven picks for NFL, NBA, MLB, NHL, NCAAF, NCAAB & WNBA.
          </Text>

          <View style={styles.bullets}>
            <Text style={styles.bullet}>• Daily predictions synced with live odds</Text>
            <Text style={styles.bullet}>• Confidence for Moneyline / Spread / Total</Text>
            <Text style={styles.bullet}>• Cancel anytime</Text>
          </View>

          <Text style={styles.price}>
            From <Text style={{ color: GOLD, fontWeight: '700' }}>$49.99/mo</Text>
          </Text>

          <Pressable
            onPress={() => router.push('/(auth)/sign-up')}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.ctaText}>Get Started</Text>
          </Pressable>

          <Link href="/(auth)/sign-in" style={styles.link}>
            Sign in
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: BLACK },
  haloWrap: { position: 'absolute', top: 80, width: 420, height: 420, alignSelf: 'center' },
  halo: { width: '100%', height: '100%', borderRadius: 420 },
  card: {
    width: '100%',
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
  },
  title: { color: WHITE, fontSize: 28, fontWeight: '800' },
  sub: { color: '#D1D5DB' },
  bullets: { marginTop: 4, gap: 2 },
  bullet: { color: '#A3A3A3' },
  price: { color: '#D1D5DB', marginTop: 4 },
  cta: { backgroundColor: GOLD, paddingVertical: 14, borderRadius: 12, marginTop: 8, alignItems: 'center' },
  ctaText: { color: BLACK, fontWeight: '800', fontSize: 16 },
  link: { alignSelf: 'center', color: '#9AB2FF', marginTop: 10, textDecorationLine: 'underline' },
});
