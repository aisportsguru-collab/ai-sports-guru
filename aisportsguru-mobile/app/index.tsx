import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,     // <— bumps the content down from the notch
          paddingBottom: 24,
          gap: 16,
        }}
      >
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', textAlign: 'center' }}>
            AI Sports Guru
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
            Smarter picks, faster.
          </Text>
        </View>

        <View style={{ gap: 12, marginTop: 12 }}>
          <Link href="/sign-in" asChild>
            <Pressable
              style={{
                backgroundColor: '#111',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                Sign in
              </Text>
            </Pressable>
          </Link>

          <Link href="/sign-up" asChild>
            <Pressable
              style={{
                backgroundColor: '#f3f4f6',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#e5e7eb',
              }}
            >
              <Text style={{ color: '#111', fontSize: 16, fontWeight: '700' }}>
                Create account
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
