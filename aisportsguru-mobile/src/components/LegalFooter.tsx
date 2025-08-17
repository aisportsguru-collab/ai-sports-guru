import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function LegalFooter({ style }: { style?: any }) {
  const router = useRouter();
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.text}>
        By using this app you agree to our
        <Text style={styles.link} onPress={() => router.push('/(onboarding)/terms')}> Terms</Text>,
        <Text style={styles.link} onPress={() => router.push('/(public)/privacy')}> Privacy</Text>,
        and
        <Text style={styles.link} onPress={() => router.push('/(public)/responsible')}> Responsible Gaming</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF88',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  link: {
    color: '#7fdca5',
    textDecorationLine: 'underline',
  },
});
