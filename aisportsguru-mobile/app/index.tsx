import React, { useRef, useEffect } from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { THEME, shadows } from "../src/theme/colors";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

export default function Landing() {
  // Subtle pulse for premium feel
  const pulse = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.9, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.BG }}>
      {/* Background gradient / vignette */}
      <LinearGradient
        colors={["#0B0B0B", "#0B0B0B", "#121317"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.heroWrap}>
          <Animated.View style={[styles.halo, { transform: [{ scale: pulse }] }]} />
          <Animated.View style={[styles.halo2, { transform: [{ scale: pulse }] }]} />
          <Animated.View style={[styles.card, { transform: [{ scale: pulse.interpolate({ inputRange: [0.9, 1], outputRange: [0.99, 1] }) }] }]}>
            <Text style={styles.title}>AI Sports Guru</Text>
            <Text style={styles.subtitle}>Premium, model‑driven picks for NFL, NBA, MLB, NHL, NCAAF, NCAAB & WNBA.</Text>

            <View style={styles.bullets}>
              <Text style={styles.bullet}>• Daily predictions synced with live odds</Text>
              <Text style={styles.bullet}>• Confidence for Moneyline / Spread / Total</Text>
              <Text style={styles.bullet}>• Cancel anytime</Text>
            </View>

            <Text style={styles.price}>From <Text style={{ color: THEME.GOLD, fontWeight: "800" }}>$49.99/mo</Text></Text>

            <Pressable onPress={() => router.replace("/(tabs)")} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
              <Text style={styles.ctaText}>Get Started</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/auth/sign-in")} style={({ pressed }) => [{ alignSelf: "center", marginTop: 10 }, pressed && { opacity: 0.8 }]}>
              <Text style={styles.signIn}>Sign in</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: "center" },
  heroWrap: { alignItems: "center", justifyContent: "center" },
  halo: {
    position: "absolute",
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: 9999,
    backgroundColor: "#11131B",
    opacity: 0.35,
    top: 40,
    ...shadows.sm,
  },
  halo2: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 9999,
    backgroundColor: THEME.GOLD,
    opacity: 0.06,
    top: 120,
    filter: "blur(30px)" as any, // ignored on native but helps on web preview
  },
  card: {
    backgroundColor: THEME.CARD,
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxWidth: 420,
    alignSelf: "center",
    ...shadows.sm,
  },
  title: { color: THEME.TEXT, fontSize: 24, fontWeight: "900" },
  subtitle: { color: THEME.MUTED, fontSize: 14, marginTop: 8 },
  bullets: { marginTop: 12, gap: 6 },
  bullet: { color: THEME.MUTED, fontSize: 13 },
  price: { color: THEME.MUTED, marginTop: 12 },
  cta: { backgroundColor: THEME.GOLD, paddingVertical: 12, borderRadius: 12, marginTop: 14 },
  ctaText: { color: "#171717", textAlign: "center", fontWeight: "900" },
  signIn: { color: THEME.MUTED, textAlign: "center", textDecorationLine: "underline" },
});
