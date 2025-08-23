import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { THEME, shadows } from "../../src/theme/colors";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

function Item({ title, href }: { title: string; href: string }) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
    >
      <Text style={styles.rowText}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color={THEME.MUTED} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.card}>
        <Item title="Privacy Policy" href="/account/privacy" />
        <View style={styles.divider} />
        <Item title="Terms of Service" href="/account/terms" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.BG, padding: 16, paddingTop: 24 },
  title: { color: THEME.TEXT, fontSize: 22, fontWeight: "800", marginBottom: 12 },
  card: {
    backgroundColor: THEME.CARD,
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 16,
    ...shadows.sm,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: { color: THEME.TEXT, fontSize: 16, fontWeight: "600" },
  divider: { height: 1, backgroundColor: THEME.BORDER, marginHorizontal: 16 },
});
