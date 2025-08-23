import { Slot } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0B' }} edges={['top','bottom']}>
      <Slot />
    </SafeAreaView>
  );
}
