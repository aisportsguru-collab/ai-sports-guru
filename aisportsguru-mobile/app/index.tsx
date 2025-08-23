import React, { useRef, useEffect } from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { THEME, shadows } from "../src/theme/colors";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

export default function Landing() {
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
            <Text style={styles.kicker}>BETTER BETS START HERE</Text>
            <Text style={styles.title}>AI Sports Guru</Text>
            <Text style={styles.subtitle}>
              Model‑driven picks + live odds for NFL, NBA, MLB, NHL, NCAAF, NCAAB & WNBA.
            </Text>

            <View style={styles.bullets}>
              <Text style={styles.bullet}>• Daily projections with confidence ratings</Text>
              <Text style={styles.bullet}>• Moneyline / Spread / Total — all in one place</Text>
              <Text style={styles.bullet}>• Track results to improve over time</Text>
            </View>

            <View style={styles.valueBox}>
              <Text style={styles.valueBig}>+$</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.valueTitle}>Join winning members</Text>
                <Text style={styles.valueSub}>From <Text style={{ color: THEME.GOLD, fontWeight: "800" }}>$49.99/mo</Text>. Cancel anytime.</Text>
              </View>
            </View>

            <Pressable onPress={() => router.replace("/(tabs)/home")} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
              <Text style={styles.ctaText}>Start 7‑day free trial</Text>
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
  kicker: { color: THEME.GOLD, fontWeight: "800", letterSpacing: 1, marginBottom: 4, fontSize: 12 },
  title: { color: THEME.TEXT, fontSize: 28, fontWeight: "900" },
  subtitle: { color: THEME.MUTED, fontSize: 14, marginTop: 8 },
  bullets: { marginTop: 12, gap: 6 },
  bullet: { color: THEME.MUTED, fontSize: 13 },
  valueBox: {
    marginTop: 14,
    backgroundColor: "#15161B",
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  valueBig: { color: THEME.GOLD, fontWeight: "900", fontSize: 20 },
  valueTitle: { color: THEME.TEXT, fontWeight: "800" },
  valueSub: { color: THEME.MUTED, marginTop: 2, fontSize: 12 },
  cta: { backgroundColor: THEME.GOLD, paddingVertical: 12, borderRadius: 12, marginTop: 14 },
  ctaText: { color: "#171717", textAlign: "center", fontWeight: "900" },
  signIn: { color: THEME.MUTED, textAlign: "center", textDecorationLine: "underline" },
});
