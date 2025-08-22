import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function SignIn() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Sign in</Text>
      {/* TODO: replace with your real sign-in form */}
      <Pressable style={s.button} onPress={() => router.replace('/home')}>
        <Text style={s.buttonText}>Continue (placeholder)</Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={s.link}>Back</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#000' },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 24 },
  button: { backgroundColor: '#FFCF33', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, marginTop: 8 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  link: { color: '#60a5fa', marginTop: 20, fontSize: 16 },
});
