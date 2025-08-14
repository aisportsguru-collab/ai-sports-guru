import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { getOfferings, purchasePackage, getCustomerInfo } from '../../../lib/purchases';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

export default function Subscribe() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState<any | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const offerings = await getOfferings();
        if (!offerings) {
          setNote('In-app purchases require a development build (not Expo Go). We can still navigate.');
          setLoading(false);
          return;
        }
        const offering = offerings.current;
        const first = offering?.availablePackages?.[0] || null;
        setPkg(first);
      } catch (e:any) {
        setNote(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startTrial = async () => {
    try {
      if (!pkg) {
        Alert.alert('Not available', 'No purchase package found. Are you running a dev build?');
        return;
      }
      const { customerInfo } = await purchasePackage(pkg);
      const ent = process.env.EXPO_PUBLIC_RC_ENTITLEMENT || 'pro';
      const active = customerInfo?.entitlements?.active?.[ent];
      if (active) {
        // Mark active in Supabase for immediate access
        await supabase.from('profiles').update({ subscription_status: 'active' })
          .eq('id', (await supabase.auth.getUser()).data.user?.id);
        Alert.alert('Success', 'Your subscription is active.');
        router.replace('/(tabs)/sports/index');
      } else {
        Alert.alert('Pending', 'Purchase completed but entitlement not active yet.');
      }
    } catch (e:any) {
      if (e?.userCancelled) return;
      Alert.alert('Purchase failed', e.message || 'Unknown error');
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Start your free trial</Text>
      <Text style={styles.p}>
        Subscribe via your {Platform.OS === 'ios' ? 'Apple' : 'Google'} account. Free trial applies if configured in the store.
      </Text>
      {note ? <Text style={{ color:'#aaa', marginTop:8 }}>{note}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={startTrial}>
        <Text style={styles.btnText}>Start 7-day free trial</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex:1, backgroundColor:'#0a0a0a', padding:16 },
  h: { color:'#fff', fontSize:22, fontWeight:'900', marginBottom:12 },
  p: { color:'#cfcfcf' },
  btn: { marginTop:18, backgroundColor:'#ffd700', padding:14, borderRadius:12, alignItems:'center', borderWidth:1, borderColor:'#e1c100' },
  btnText: { color:'#0a0a0a', fontWeight:'900' },
});
