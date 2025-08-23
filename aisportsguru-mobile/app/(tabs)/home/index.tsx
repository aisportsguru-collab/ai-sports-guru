import { useRouter, Link } from 'expo-router';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { LEAGUES } from '../../../src/constants/leagues';
// Optional footer; remove if you prefer
import LegalFooter from '../../../src/components/LegalFooter';

const GOLD = '#F5C847';
const BG   = '#0B0B0B';
const CARD = '#121317';
const BORDER = '#232632';
const MUTED= '#A6A6A6';

export default function Home() {
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.container}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>AI Sports Guru</Text>
          <Text style={styles.bannerSub}>Premium predictions, beautiful experience.</Text>
          <Pressable style={styles.primary} onPress={() => router.push('/(tabs)/sports')}>
            <Text style={styles.primaryText}>Go to Predictions</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Leagues</Text>

        <View style={styles.grid}>
          {LEAGUES.map((lg) => (
            <Pressable key={lg.id} style={styles.card} onPress={() => router.push(`/(tabs)/home/league/${lg.id}`)}>
              <Text style={styles.cardTitle}>{lg.title}</Text>
              <Text style={styles.cardSub}>View odds & picks →</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>More</Text>

        <View style={styles.row}>
          <Link href="/account" style={styles.bigLink}>Account{'\n'}<Text style={{ color: MUTED, fontWeight: '400' }}>Subscription & profile.</Text></Link>
          <Link href="/(tabs)/home/settings" style={styles.bigLink}>Settings{'\n'}<Text style={{ color: MUTED, fontWeight: '400' }}>Theme, preferences, more.</Text></Link>
        </View>

        <LegalFooter />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  banner: { backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, padding: 16, borderRadius: 16, marginBottom: 12 },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  bannerSub: { color: MUTED, marginTop: 6 },
  primary: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#0B0B0B', fontWeight: '800' },
  section: { color: '#fff', fontWeight: '800', fontSize: 18, marginTop: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: 14, padding: 16, width: '48%' },
  cardTitle: { color: '#fff', fontWeight: '800', marginBottom: 8 },
  cardSub: { color: MUTED },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  bigLink: { flex: 1, backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, padding: 16, borderRadius: 14, color: '#fff', fontWeight: '800' },
});
