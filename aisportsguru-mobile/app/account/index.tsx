import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function AccountScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b0c', padding: 24 }}>
      <Text style={{ color: 'white', fontSize: 22, fontWeight: '700', marginBottom: 12 }}>
        Account
      </Text>
      <Text style={{ color: '#c9c9c9', marginBottom: 24 }}>
        Manage subscription & profile.
      </Text>
      <Pressable
        onPress={() => router.push('/(tabs)/home')}
        style={{ backgroundColor: '#d4af37', padding: 14, borderRadius: 12, alignItems: 'center' }}
      >
        <Text style={{ color: '#000', fontWeight: '700' }}>Back to Home</Text>
      </Pressable>
    </View>
  );
}
