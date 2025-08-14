import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

const cleanPhone = (s: string) => s.replace(/[^\d+]/g, '');

export default function Signup() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [busy, setBusy]           = useState(false);

  const upsertProfile = async (userId: string) => {
    // Safe even if the profiles table doesn’t exist yet.
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone: cleanPhone(phone)
      });
    } catch {}
  };

  const onSignup = async () => {
    if (!firstName || !lastName || !email || !password) {
      return Alert.alert('Missing info', 'Please fill First, Last, Email and Password.');
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: cleanPhone(phone)
        }
      }
    });
    setBusy(false);

    if (error) return Alert.alert('Sign up failed', error.message);

    // If email confirmation is OFF, we might already have a session:
    if (data.user?.id) await upsertProfile(data.user.id);

    Alert.alert('Check your email', 'Confirm your email to finish sign up.');
    router.replace('/(auth)/login');
  };

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor:'#0a0a0a' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Create your account</Text>

        <View style={{ flexDirection:'row', gap:10 }}>
          <TextInput
            style={[styles.input, { flex:1 }]}
            placeholder="First name"
            placeholderTextColor="#7a7a7a"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={[styles.input, { flex:1 }]}
            placeholder="Last name"
            placeholderTextColor="#7a7a7a"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Phone"
          placeholderTextColor="#7a7a7a"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#7a7a7a"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#7a7a7a"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={[styles.btn, busy && { opacity:0.6 }]} disabled={busy} onPress={onSignup}>
          <Text style={styles.btnText}>{busy ? 'Creating…' : 'Create Account'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop:14 }} onPress={() => router.replace('/(auth)/login')}>
          <Text style={{ color:'#bdbdbd', textAlign:'center' }}>
            Already have an account? <Text style={{ color:'#ffd700' }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex:1, justifyContent:'center', padding:24 },
  title: { color:'#fff', fontSize:22, fontWeight:'900', textAlign:'center', marginBottom:20 },
  input: { backgroundColor:'#151515', color:'#fff', padding:12, borderRadius:12, marginTop:12, borderWidth:1, borderColor:'#232323' },
  btn: { marginTop:18, backgroundColor:'#ffd700', padding:14, borderRadius:12, alignItems:'center', borderWidth:1, borderColor:'#e1c100' },
  btnText: { color:'#0a0a0a', fontWeight:'900' },
});
