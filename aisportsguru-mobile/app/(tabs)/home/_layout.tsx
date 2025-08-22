import { Slot } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

export default function HomeSegmentLayout() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0B' }} edges={['top','bottom']}>
      {/* dial the spacer down so content isn't pushed too far */}
      <View style={{ height: Math.max(8, insets.top * 0.18) }} />
      <Slot />
    </SafeAreaView>
  );
}
