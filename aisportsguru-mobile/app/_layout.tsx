import { Stack } from 'expo-router';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

const GOLD = '#D4AF37';
const BLACK = '#0B0B0B';
const WHITE = '#FFFFFF';

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: GOLD,
    background: BLACK,
    card: '#111111',
    text: WHITE,
    border: '#2A2A2A',
    notification: GOLD,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={AppTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: BLACK },
          headerTintColor: WHITE,
          headerTitleStyle: { color: WHITE, fontWeight: '700' },
          contentStyle: { backgroundColor: BLACK },
        }}
      />
    </ThemeProvider>
  );
}
