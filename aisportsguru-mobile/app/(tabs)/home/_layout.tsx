import { Stack } from 'expo-router';
import { COLORS } from '../../../lib/theme';

export default function HomeStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg },
        headerTintColor: COLORS.text,
      }}
    />
  );
}
