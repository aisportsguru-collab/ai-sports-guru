import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b0f2a' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: Aug 2025</Text>

        <Text style={styles.p}>
          We respect your privacy. This policy explains what information we collect, how we use it, and your choices.
          We collect app usage data to improve features, and purchase status to manage subscriptions.
          We do not sell personal information.
        </Text>

        <Text style={styles.h}>Data We Collect</Text>
        <Text style={styles.p}>
          Device and app telemetry, subscription status, and minimal identifiers required for account features.
        </Text>

        <Text style={styles.h}>How We Use Data</Text>
        <Text style={styles.p}>
          To operate the app, provide predictions and features, diagnose issues, and improve user experience.
        </Text>

        <Text style={styles.h}>Security</Text>
        <Text style={styles.p}>
          We use reasonable safeguards to protect data. No method is 100% secure.
        </Text>

        <Text style={styles.h}>Your Choices</Text>
        <Text style={styles.p}>
          You can request deletion of your data where applicable and manage subscription preferences through Apple.
        </Text>

        <View style={{ height: 24 }} />
        <Text onPress={() => router.back()} style={styles.link}>← Back</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700' },
  updated: { color: '#FFFFFF88', marginVertical: 6 },
  h: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 18, marginBottom: 6 },
  p: { color: '#FFFFFFCC', fontSize: 14, lineHeight: 20 },
  link: { color: '#7fdca5', textDecorationLine: 'underline', fontSize: 16 },
});
