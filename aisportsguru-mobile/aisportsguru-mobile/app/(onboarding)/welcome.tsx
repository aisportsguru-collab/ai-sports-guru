import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Button from '~/components/ui/Button';

const { width } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.wrap}>
      {/* Animated orb background */}
      <Animated.View style={[styles.bgOrb, { transform: [{ rotate }] }]}>
        <LinearGradient colors={['#1b1b1b', '#0f0f0f', '#0a0a0a']} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['#ffd70030', '#00000000', '#ffd70020']}
          style={styles.glow}
        />
      </Animated.View>

      <Text style={styles.brand}>AI Sports Guru</Text>
      <Text style={styles.tag}>
        Model-driven picks for NFL, NBA, MLB, NHL, NCAAF, NCAAB and WNBA.
      </Text>

      <View style={styles.bullets}>
        <Text style={styles.bullet}>• Daily predictions cached for speed</Text>
        <Text style={styles.bullet}>• Live odds via TheOddsAPI</Text>
        <Text style={styles.bullet}>• Gated access by subscription</Text>
      </View>

      <View style={{ height: 20 }} />
      <Button title="Get Started" onPress={() => router.replace('/(auth)/login')} />
    </View>
  );
}

const RADIUS = width * 0.6;

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  brand: { color: 'white', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  tag: { color: '#bdbdbd', marginTop: 8, textAlign: 'center' },
  bullets: { marginTop: 16, alignSelf: 'stretch', gap: 6 },
  bullet: { color: '#d6d6d6' },
  bgOrb: { position: 'absolute', width: width * 1.2, height: width * 1.2, borderRadius: RADIUS, top: -width * 0.3, opacity: 0.6 },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: RADIUS }
});
