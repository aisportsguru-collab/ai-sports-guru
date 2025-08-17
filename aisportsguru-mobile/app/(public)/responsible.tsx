import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView, Linking } from 'react-native';
import { useRouter } from 'expo-router';

export default function ResponsibleGamingScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b0f2a' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Responsible Gaming</Text>
        <Text style={styles.p}>
          Use predictions for fun, education, and research. If you choose to wager, set limits and stay in control.
        </Text>

        <Text style={styles.h}>Tips</Text>
        <Text style={styles.p}>• Only wager what you can afford to lose.</Text>
        <Text style={styles.p}>• Set time and spend limits.</Text>
        <Text style={styles.p}>• Do not chase losses.</Text>
        <Text style={styles.p}>• Take breaks and keep perspective.</Text>

        <Text style={styles.h}>Get Help</Text>
        <Text style={styles.p}>
          If gambling becomes a problem, resources are available in many regions. 
          In the US, you can call or text 1-800-GAMBLER or visit{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://www.1800gambler.net/')}>1800gambler.net</Text>.
        </Text>

        <View style={{ height: 24 }} />
        <Text onPress={() => router.back()} style={styles.link}>← Back</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  h: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 18, marginBottom: 6 },
  p: { color: '#FFFFFFCC', fontSize: 14, lineHeight: 20 },
  link: { color: '#7fdca5', textDecorationLine: 'underline', fontSize: 16 },
});
