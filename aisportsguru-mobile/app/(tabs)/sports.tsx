import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { THEME, shadows } from "../../src/theme/colors";

const LEAGUES = [
  { id: "nfl", label: "NFL" },
  { id: "nba", label: "NBA" },
  { id: "mlb", label: "MLB" },
  { id: "nhl", label: "NHL" },
  { id: "ncaaf", label: "NCAAF" },
  { id: "ncaab", label: "NCAAB" },
  { id: "wnba", label: "WNBA" },
];

export default function SportsHub() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: THEME.BG }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Choose a League</Text>
      <View style={styles.grid}>
        {LEAGUES.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => router.push(`/(tabs)/home/league/${l.id}`)}
            style={({ pressed }) => [
              styles.tile,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.tileText}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 24 },
  title: { color: THEME.TEXT, fontSize: 22, fontWeight: "700", marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    backgroundColor: THEME.CARD,
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 16,
    width: "47.5%",
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  tileText: { color: THEME.GOLD, fontSize: 18, fontWeight: "700" },
});
