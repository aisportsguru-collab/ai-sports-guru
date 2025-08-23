import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Link } from 'expo-router';

export default function AccountScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My Account</Text>
      <Text style={styles.subtitle}>Manage your subscription and profile.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription</Text>
        <Text style={styles.cardText}>AI Sports Guru Pro — $49.99/mo</Text>
        <Link href="/home/settings" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>Manage settings</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 24, backgroundColor: '#0B0B0B', flexGrow: 1 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#A1AAB7', marginBottom: 16 },
  card: { backgroundColor: '#111318', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1F1F1F' },
  cardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardText: { color: '#D1D5DB', marginBottom: 12 },
  btn: { backgroundColor: '#F5C451', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#0B0B0B', fontWeight: '700' },
});
