import React from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable } from "react-native";
import { THEME, shadows } from "../../src/theme/colors";
import { router } from "expo-router";

export default function Account() {
  const user = { name: "Jordan Smith", email: "you@example.com" }; // replace with Supabase user later

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.BG }}>
      <View style={styles.root}>
        <Text style={styles.title}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user.name}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/account/settings")}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.btnText}>Open Settings</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, paddingTop: 24 },
  title: { color: THEME.TEXT, fontSize: 24, fontWeight: "900", marginBottom: 16 },
  card: {
    backgroundColor: THEME.CARD,
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...shadows.sm,
  },
  label: { color: THEME.MUTED, fontSize: 13, marginTop: 6 },
  value: { color: THEME.TEXT, fontSize: 16, fontWeight: "600" },
  divider: { height: 1, backgroundColor: THEME.BORDER, marginVertical: 12 },
  btn: {
    backgroundColor: THEME.GOLD,
    paddingVertical: 14,
    borderRadius: 14,
    ...shadows.sm,
  },
  btnText: { color: "#171717", fontWeight: "900", textAlign: "center" },
});
