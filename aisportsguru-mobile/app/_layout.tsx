import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { COLORS } from '../lib/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: COLORS.bg },
          headerStyle: { backgroundColor: COLORS.bg },
          headerTintColor: COLORS.text,
          headerTitleStyle: { color: COLORS.text, fontWeight: '800' },
        }}
      />
    </>
  );
}
