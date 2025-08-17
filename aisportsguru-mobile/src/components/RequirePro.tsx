import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEntitlement } from '../providers/EntitlementAdapter';

export default function RequirePro({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hasPro, loading } = useEntitlement();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loading}>Checking your subscription…</Text>
      </View>
    );
  }

  if (!hasPro) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Pro required</Text>
        <Text style={styles.subtitle}>
          Unlock AI-powered predictions, real-time odds updates, and premium insights.
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/(public)/paywall')}
          style={styles.cta}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>Upgrade to Pro</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={{ paddingTop: 8 }}>
          <Text style={styles.link}>Maybe later</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          By using this app you agree to our <Text style={styles.link}>Terms</Text>,{' '}
          <Text style={styles.link}>Privacy</Text>, and{' '}
          <Text style={styles.link}>Responsible Gaming</Text>.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#fff', marginTop: 10 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#ffffffcc', textAlign: 'center', marginBottom: 20 },
  cta: {
    backgroundColor: '#3fc060',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 180,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { color: '#A0F3BD', textDecorationLine: 'underline' },
  legal: { color: '#ffffff88', fontSize: 12, marginTop: 24, textAlign: 'center' },
});
