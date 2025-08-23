import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

const GOLD = '#F5C847';
const BG   = '#0B0B0B';
const CARD = '#121317';
const MUTED= '#A6A6A6';

export default function Landing() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.heroWrap}>
        <View style={styles.hero}>
          <Text style={styles.title}>AI Sports Guru</Text>
          <Text style={styles.copy}>
            Premium, model-driven picks for NFL, NBA, MLB, NHL, NCAAF, NCAAB & WNBA.
          </Text>
          <View style={{ height: 8 }} />
          <Text style={styles.bullets}>{'\u2022'} Daily predictions synced with live odds{'\n'}{'\u2022'} Confidence for Moneyline / Spread / Total{'\n'}{'\u2022'} Cancel anytime</Text>
          <View style={{ height: 12 }} />
          <Text style={styles.price}>From <Text style={{ fontWeight: '700', color: '#fff' }}>$49.99/mo</Text></Text>
          <View style={{ height: 16 }} />

          <Link href="/(auth)/sign-up" asChild>
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>Get Started</Text>
            </Pressable>
          </Link>

          <View style={{ height: 14 }} />
          <Link href="/(auth)/sign-in" style={styles.link}>Sign in</Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroWrap: { padding: 20 },
  hero: { backgroundColor: CARD, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#232632' },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  copy: { color: MUTED, marginTop: 8, lineHeight: 20 },
  bullets: { color: MUTED, lineHeight: 20 },
  price: { color: MUTED, marginTop: 8 },
  cta: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: '#0B0B0B', fontWeight: '800', fontSize: 16 },
  link: { color: '#5AA7FF', textAlign: 'center', marginTop: 8 }
});
