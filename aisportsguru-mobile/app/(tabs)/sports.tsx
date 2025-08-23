import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { THEME, shadows } from "../../src/theme/colors";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/api";

export default function SportsHub() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["leagues"],
    queryFn: () => api.leagues(),
  });

  const leagues = data ?? ["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: THEME.BG }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Choose a League</Text>

      {isLoading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={THEME.GOLD} />
          <Text style={styles.loadingText}>Loading leagues…</Text>
        </View>
      )}

      {isError && (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Could not load leagues.</Text>
          <Pressable onPress={() => refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.grid}>
        {leagues.map((id) => (
          <Pressable
            key={id}
            onPress={() => router.push(`/(tabs)/home/league/${id}`)}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          >
            <Text style={styles.tileText}>{String(id).toUpperCase()}</Text>
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
  loadingCard: {
    backgroundColor: THEME.CARD, borderColor: THEME.BORDER, borderWidth: 1, borderRadius: 16,
    padding: 16, marginBottom: 12, alignItems: "center", gap: 8, ...shadows.sm,
  },
  loadingText: { color: THEME.MUTED },
  retry: { backgroundColor: THEME.GOLD, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  retryText: { color: "#171717", fontWeight: "900" },
});
