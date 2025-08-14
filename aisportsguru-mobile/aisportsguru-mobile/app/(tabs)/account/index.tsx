import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../../lib/supabase';

export default function AccountScreen() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [email,     setEmail]     = useState('');   // display & update
  const [subStatus, setSubStatus] = useState<string>('none');

  // email/password forms
  const [newEmail, setNewEmail]       = useState('');
  const [newPass,  setNewPass]        = useState('');
  const [saving,   setSaving]         = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    setUserId(user.id);
    setEmail(user.email ?? '');

    // read profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name,last_name,phone,email')
      .eq('id', user.id)
      .single();

    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setPhone(profile.phone ?? '');
      if (profile.email && !user.email) setEmail(profile.email);
    }

    // (Optional) if you store subscription on a view/table, fetch it here.
    // For now we mirror what you had:
    // setSubStatus('active'|'trialing'|'none')
    setSubStatus('none');

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      phone
    });
    setSaving(false);
    if (error) return Alert.alert('Save failed', error.message);
    Alert.alert('Saved', 'Your profile was updated.');
  };

  const updateEmail = async () => {
    if (!newEmail) return Alert.alert('Enter a new email');
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSaving(false);
    if (error) return Alert.alert('Email update failed', error.message);
    Alert.alert('Check your email', 'Confirm the new email to complete the change.');
    setNewEmail('');
    // local display stays until confirm completes
  };

  const changePassword = async () => {
    if (!newPass || newPass.length < 8) {
      return Alert.alert('Password too short', 'Use at least 8 characters.');
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSaving(false);
    if (error) return Alert.alert('Password change failed', error.message);
    Alert.alert('Success', 'Your password has been changed.');
    setNewPass('');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    Alert.alert('Signed out');
  };

  if (loading) {
    return (
      <View style={[styles.wrap, { alignItems:'center', justifyContent:'center' }]}>
        <Text style={{ color:'#aaa' }}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding:16 }}>
      <Text style={styles.h}>Account</Text>
      <Text style={styles.kv}><Text style={styles.k}>Status:</Text> {subStatus}</Text>

      <Text style={styles.section}>Profile</Text>
      <View style={{ flexDirection:'row', gap:10 }}>
        <TextInput style={[styles.input, { flex:1 }]} placeholder="First name" placeholderTextColor="#7a7a7a"
          value={firstName} onChangeText={setFirstName}/>
        <TextInput style={[styles.input, { flex:1 }]} placeholder="Last name" placeholderTextColor="#7a7a7a"
          value={lastName} onChangeText={setLastName}/>
      </View>
      <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#7a7a7a"
        keyboardType="phone-pad" value={phone} onChangeText={setPhone}/>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#7a7a7a"
        autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/>

      <TouchableOpacity style={[styles.btn, saving && { opacity:0.6 }]} disabled={saving} onPress={saveProfile}>
        <Text style={styles.btnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Update email</Text>
      <TextInput style={styles.input} placeholder="New email" placeholderTextColor="#7a7a7a"
        autoCapitalize="none" keyboardType="email-address" value={newEmail} onChangeText={setNewEmail}/>
      <TouchableOpacity style={[styles.btn, saving && { opacity:0.6 }]} disabled={saving} onPress={updateEmail}>
        <Text style={styles.btnText}>Send confirmation</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Change password</Text>
      <TextInput style={styles.input} placeholder="New password" placeholderTextColor="#7a7a7a"
        secureTextEntry value={newPass} onChangeText={setNewPass}/>
      <TouchableOpacity style={[styles.btn, saving && { opacity:0.6 }]} disabled={saving} onPress={changePassword}>
        <Text style={styles.btnText}>Change password</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Subscription</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor:'#1f1f1f', borderColor:'#2d2d2d' }]}
        onPress={() => WebBrowser.openBrowserAsync('https://www.aisportsguru.com/account')}>
        <Text style={[styles.btnText, { color:'#fff' }]}>Manage subscription</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor:'#2a2a2a', borderColor:'#3a3a3a', marginTop:12 }]} onPress={signOut}>
        <Text style={[styles.btnText, { color:'#fff' }]}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex:1, backgroundColor:'#0a0a0a' },
  h: { color:'#fff', fontSize:22, fontWeight:'900', marginBottom:6 },
  kv: { color:'#ddd', marginBottom:10 },
  k: { color:'#9a9a9a' },
  section: { color:'#bdbdbd', marginTop:18, marginBottom:6, fontWeight:'800' },
  input: { backgroundColor:'#151515', color:'#fff', padding:12, borderRadius:12, marginTop:10, borderWidth:1, borderColor:'#232323' },
  btn: { marginTop:12, backgroundColor:'#ffd700', padding:14, borderRadius:12, alignItems:'center', borderWidth:1, borderColor:'#e1c100' },
  btnText: { color:'#0a0a0a', fontWeight:'900' },
});
