import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';

export default function Subscribe() {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Try AI Sports Guru</Text>
      <Text style={styles.p}>
        In-app billing (free trial & subscriptions) will be enabled after App Store / Play setup.
        For now, you can subscribe on the website.
      </Text>

      <TouchableOpacity style={styles.btn} onPress={() => WebBrowser.openBrowserAsync('https://www.aisportsguru.com/pricing')}>
        <Text style={styles.btnText}>Open Pricing</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={() => router.back()}>
        <Text style={[styles.btnText, { color:'#fff' }]}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex:1, backgroundColor:'#0a0a0a', padding:16, justifyContent:'center' },
  h: { color:'#fff', fontSize:24, fontWeight:'900', marginBottom:8, textAlign:'center' },
  p: { color:'#bdbdbd', textAlign:'center', marginBottom:16 },
  btn: { backgroundColor:'#ffd700', padding:14, borderRadius:12, alignItems:'center', borderWidth:1, borderColor:'#e1c100', marginTop:8 },
  ghost: { backgroundColor:'#1a1a1a', borderColor:'#2a2a2a' },
  btnText: { color:'#0a0a0a', fontWeight:'900' }
});
