import React from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { THEME, shadows } from "../../../src/theme/colors";
import { router } from "expo-router";

const LEAGUES = [
  { id: "nfl", label: "NFL" },
  { id: "nba", label: "NBA" },
  { id: "mlb", label: "MLB" },
  { id: "nhl", label: "NHL" },
  { id: "ncaaf", label: "NCAAF" },
  { id: "ncaab", label: "NCAAB" },
  { id: "wnba", label: "WNBA" },
];

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.BG }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>AI Sports Guru</Text>
            <Text style={styles.heroSub}>Premium predictions, beautiful experience.</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/sports")} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
            <Text style={styles.ctaText}>Go to Predictions</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Leagues</Text>
        <View style={styles.grid}>
          {LEAGUES.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => router.push(`/(tabs)/home/league/${l.id}`)}
              style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.tileLabel}>{l.label}</Text>
              <Text style={styles.tileLink}>View odds & picks →</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>More</Text>
        <View style={styles.moreRow}>
          <Pressable onPress={() => router.push("/(tabs)/account")} style={({ pressed }) => [styles.moreCard, pressed && { opacity: 0.9 }]}>
            <Text style={styles.moreTitle}>Account</Text>
            <Text style={styles.moreSub}>Subscription & profile.</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/account/settings")} style={({ pressed }) => [styles.moreCard, pressed && { opacity: 0.9 }]}>
            <Text style={styles.moreTitle}>Settings</Text>
            <Text style={styles.moreSub}>Theme, preferences, more.</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: THEME.CARD,
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    ...shadows.sm,
    marginBottom: 16,
  },
  heroHeader: { marginBottom: 10 },
  heroTitle: { color: THEME.TEXT, fontSize: 18, fontWeight: "900" },
  heroSub: { color: THEME.MUTED, fontSize: 13, marginTop: 4 },
  cta: { backgroundColor: THEME.GOLD, paddingVertical: 10, borderRadius: 12, alignSelf: "flex-start" },
  ctaText: { color: "#171717", fontWeight: "900" },

  sectionTitle: { color: THEME.TEXT, fontSize: 16, fontWeight: "800", marginBottom: 8, marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    width: "47.5%",
    backgroundColor: THEME.CARD,
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    ...shadows.sm,
  },
  tileLabel: { color: THEME.GOLD, fontSize: 16, fontWeight: "800", marginBottom: 6 },
  tileLink: { color: THEME.MUTED, fontSize: 12 },

  moreRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  moreCard: {
    flex: 1,
    backgroundColor: THEME.CARD,
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    ...shadows.sm,
  },
  moreTitle: { color: THEME.TEXT, fontWeight: "800" },
  moreSub: { color: THEME.MUTED, marginTop: 4, fontSize: 12 },
});
