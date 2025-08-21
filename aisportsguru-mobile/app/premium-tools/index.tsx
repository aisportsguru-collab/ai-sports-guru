import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { usePro } from '../../src/providers/ProProvider';

export default function PremiumTools() {
  const { hasPro, loading } = usePro();

  if (loading) return null; // or a small spinner
  if (!hasPro) return <Redirect href="/(tabs)/sports" />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Premium Tools 🔒➡️🔓</Text>
    </View>
  );
}
