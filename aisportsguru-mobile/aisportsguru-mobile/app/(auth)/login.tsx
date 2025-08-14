import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const syncProfileIfNeeded = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const md = user.user_metadata || {};
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        first_name: md.first_name ?? null,
        last_name: md.last_name ?? null,
        phone: md.phone ?? null,
      });
    } catch {}
  };

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return Alert.alert('Sign in failed', error.message);
    await syncProfileIfNeeded();
    router.replace('/(tabs)/sports/index');
  };

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor:'#0a0a0a' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.wrap}>
        <Text style={styles.title}>AI Sports Guru</Text>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#7a7a7a"
          autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/>
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#7a7a7a"
          secureTextEntry value={password} onChangeText={setPassword}/>
        <TouchableOpacity style={[styles.btn, busy && { opacity:0.6 }]} disabled={busy} onPress={signIn}>
          <Text style={styles.btnText}>{busy ? 'Signing in…' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop:14 }} onPress={() => router.replace('/(auth)/signup')}>
          <Text style={{ color:'#bdbdbd', textAlign:'center' }}>New here? <Text style={{ color:'#ffd700' }}>Create an account</Text></Text>
        </TouchableOpacity>

        <Text style={styles.note}>Subscriptions will run through in-app purchases (RevenueCat) once your Apple/Google setup is ready.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex:1, justifyContent:'center', padding:24 },
  title: { color:'#fff', fontSize:24, fontWeight:'900', textAlign:'center', marginBottom:24 },
  input: { backgroundColor:'#151515', color:'#fff', padding:12, borderRadius:12, marginBottom:12, borderWidth:1, borderColor:'#232323' },
  btn: { backgroundColor:'#ffd700', padding:14, borderRadius:12, alignItems:'center', borderWidth:1, borderColor:'#e1c100' },
  btnText: { color:'#0a0a0a', fontWeight:'900' },
  note: { color:'#9d9d9d', fontSize:12, textAlign:'center', marginTop:16 }
});
