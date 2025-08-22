import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function Landing() {
  return (
    <View style={s.container}>
      <Text style={s.title}>AI Sports Guru</Text>
      <Text style={s.copy}>
        Model-driven picks for NFL, NBA, MLB, NHL, NCAAF, NCAAB, and WNBA.
      </Text>

      <Pressable style={s.cta} onPress={() => router.push('/sign-up')}>
        <Text style={s.ctaText}>Get Started</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/sign-in')}>
        <Text style={s.link}>I already have an account</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 24, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 34, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  copy: { color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  cta: { backgroundColor: '#FFCF33', paddingVertical: 16, borderRadius: 12, marginBottom: 14, alignItems: 'center' },
  ctaText: { color: '#000', fontWeight: '800', fontSize: 16 },
  link: { color: '#e5e7eb', textAlign: 'center', textDecorationLine: 'underline', marginTop: 6 },
});
