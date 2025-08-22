import { SafeAreaView, View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../lib/theme';

export default function Landing() {
  const price = '$9.99/mo'; // tweak later if needed

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      {/* Background halos */}
      <View style={styles.backdrop} pointerEvents="none">
        <LinearGradient
          colors={['rgba(245,197,24,0.18)', 'rgba(245,197,24,0.03)', 'transparent']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.halo, { top: -90, left: -60 }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.haloSmall, { top: 80, right: -40 }]}
        />
      </View>

      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.logoText}>AI Sports Guru</Text>
          <Text style={styles.tagline}>
            Premium, model-driven picks for NFL, NBA, MLB, NHL, NCAAF, NCAAB & WNBA.
          </Text>

          <View style={styles.highlights}>
            <Text style={styles.bullet}>• Daily predictions synced with live odds</Text>
            <Text style={styles.bullet}>• Confidence for Moneyline / Spread / Total</Text>
            <Text style={styles.bullet}>• Cancel anytime</Text>
          </View>

          <Text style={styles.price}>From {price}</Text>

          <Link href="/sign-up" asChild>
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>Get Started</Text>
            </Pressable>
          </Link>

          <Link href="/sign-in" style={styles.secondaryLink}>
            <Text style={styles.secondaryLinkText}>Sign in</Text>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: { paddingHorizontal: 20, paddingTop: 16, flex: 1, justifyContent: 'center' },
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.stroke,
  },
  logoText: { color: COLORS.text, fontSize: 34, fontWeight: '800', marginBottom: 8, letterSpacing: 0.2 },
  tagline: { color: COLORS.muted, fontSize: 16, lineHeight: 22 },
  highlights: { marginTop: 16, gap: 6 },
  bullet: { color: COLORS.muted, fontSize: 15 },
  price: { marginTop: 14, color: COLORS.gold, fontWeight: '700', letterSpacing: 0.3 },
  cta: {
    marginTop: 18,
    backgroundColor: COLORS.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaText: { color: '#111', fontSize: 17, fontWeight: '800' },
  secondaryLink: { marginTop: 12, alignSelf: 'center' },
  secondaryLinkText: { color: COLORS.text, textDecorationLine: 'underline', opacity: 0.9 },
  backdrop: { position: 'absolute', inset: 0 },
  halo: { position: 'absolute', width: 360, height: 360, borderRadius: 360, transform: [{ rotate: '8deg' }] },
  haloSmall:{ position:'absolute', width:220, height:220, borderRadius:220, transform:[{ rotate:'-10deg' }]},
});
