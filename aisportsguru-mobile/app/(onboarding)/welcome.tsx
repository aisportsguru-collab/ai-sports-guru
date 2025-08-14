import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';

export default function Welcome() {
  const router = useRouter();
  const spin = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0,1], outputRange: ['0deg','360deg'] });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.aura, { transform: [{ rotate }] }]} />
      <Text style={styles.h}>AI Sports Guru</Text>
      <Text style={styles.p}>
        Model-driven picks for NFL, NBA, MLB, NHL, NCAAF, NCAAB and WNBA.
      </Text>
      <View style={{ height: 12 }} />
      <View style={styles.bullets}>
        <Text style={styles.b}>• Daily predictions cached for speed</Text>
        <Text style={styles.b}>• Live odds via TheOddsAPI</Text>
        <Text style={styles.b}>• Gated access by subscription</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/signup')}>
        <Text style={styles.btnText}>Get Started</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.ghost}>
        <Text style={{ color:'#ddd' }}>I already have an account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex:1, padding:24, justifyContent:'center', backgroundColor:'#0a0a0a' },
  h: { color:'#fff', fontSize:28, fontWeight:'900', textAlign:'center', marginBottom:12 },
  p: { color:'#bdbdbd', textAlign:'center' },
  bullets: { marginTop:10, gap:6 },
  b: { color:'#a3a3a3' },
  btn: { marginTop:18, backgroundColor:'#ffd700', padding:14, borderRadius:12, alignItems:'center' },
  btnText: { color:'#0a0a0a', fontWeight:'900' },
  ghost: { marginTop:12, alignItems:'center' },
  aura: { position:'absolute', top:90, alignSelf:'center', width:260, height:260, borderRadius:130, borderWidth:14, borderColor:'#1b1b1b', opacity:0.6 }
});
