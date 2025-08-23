import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { THEME } from "../../src/theme/colors";
import { router } from "expo-router";

export default function AccountTab() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.subtitle}>Manage your subscription, profile, and settings.</Text>

      <Pressable onPress={() => router.push("/account/settings")} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}>
        <Text style={styles.btnText}>Open Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.BG, padding: 16, paddingTop: 24 },
  title: { color: THEME.TEXT, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: THEME.MUTED, fontSize: 14, marginBottom: 16 },
  btn: { backgroundColor: THEME.GOLD, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignSelf: "flex-start" },
  btnText: { color: "#171717", fontWeight: "800" },
});
