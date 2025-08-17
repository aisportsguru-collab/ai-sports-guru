import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

function CheckBox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onToggle} style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
    </TouchableOpacity>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const continueNext = async () => {
    if (!accepted) {
      Alert.alert('Please accept', 'You must accept the Terms to continue.');
      return;
    }
    try {
      setSaving(true);
      await AsyncStorage.setItem('tosAccepted', '1');
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save your acceptance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b0f2a' }}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to AI Sports Guru</Text>
        <Text style={styles.subtitle}>
          Predictions are informational and for educational and entertainment purposes only. 
          No guarantee of outcomes. Wager responsibly and within your means.
        </Text>

        <View style={styles.acceptRow}>
          <CheckBox checked={accepted} onToggle={() => setAccepted(v => !v)} />
          <Text style={styles.acceptText}>
            I agree to the 
            <Text style={styles.link} onPress={() => router.push('/(onboarding)/terms')}> Terms of Use</Text>, 
            <Text style={styles.link} onPress={() => router.push('/(public)/privacy')}> Privacy Policy</Text>, and 
            <Text style={styles.link} onPress={() => router.push('/(public)/responsible')}> Responsible Gaming</Text>.
          </Text>
        </View>

        <TouchableOpacity
          onPress={continueNext}
          disabled={!accepted || saving}
          style={[styles.cta, (!accepted || saving) && styles.ctaDisabled]}
        >
          <Text style={styles.ctaText}>{saving ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Linking.openURL('mailto:support@aisportsguru.com')}>
          <Text style={styles.helpText}>Need help? Contact support</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  subtitle: { color: '#FFFFFFCC', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  acceptRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  checkbox: {
    width: 28, height: 28, borderRadius: 6, borderWidth: 2, borderColor: '#3fc060',
    marginRight: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent',
  },
  checkboxChecked: { backgroundColor: '#3fc060' },
  checkboxMark: { color: '#0b0f2a', fontSize: 18, fontWeight: '800' },
  acceptText: { color: '#FFFFFFCC', flex: 1, fontSize: 14, lineHeight: 20 },
  link: { color: '#7fdca5', textDecorationLine: 'underline' },
  cta: { backgroundColor: '#3fc060', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  helpText: { color: '#FFFFFF88', fontSize: 12, textAlign: 'center', marginTop: 8, textDecorationLine: 'underline' },
});
