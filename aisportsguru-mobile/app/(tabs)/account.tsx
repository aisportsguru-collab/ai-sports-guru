import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { THEME } from "../../src/theme/colors";
import { router } from "expo-router";

export default function AccountTab() {
  const [name, setName] = useState("Guest User");
  const [email, setEmail] = useState("guest@example.com");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.BG }}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.sub}>Manage your subscription, profile, and settings.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Full name</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Full name" placeholderTextColor={THEME.MUTED} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email" placeholderTextColor={THEME.MUTED} autoCapitalize="none" keyboardType="email-address" />
        </View>

        <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]} onPress={() => {}}>
          <Text style={styles.btnText}>Save changes</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.9 }]} onPress={() => {}}>
          <Text style={styles.ghostText}>Manage subscription</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.9 }]} onPress={() => router.push("/account/settings")}>
          <Text style={styles.linkText}>Open Settings</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, paddingTop: 24 },
  title: { color: THEME.TEXT, fontSize: 22, fontWeight: "900" },
  sub: { color: THEME.MUTED, marginTop: 4, marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { color: THEME.MUTED, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: THEME.CARD, borderColor: THEME.BORDER, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, color: THEME.TEXT,
  },
  btn: { backgroundColor: THEME.GOLD, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  btnText: { color: "#171717", textAlign: "center", fontWeight: "900" },
  ghost: { borderColor: THEME.GOLD, borderWidth: 1, paddingVertical: 12, borderRadius: 12, marginTop: 10 },
  ghostText: { color: THEME.GOLD, textAlign: "center", fontWeight: "800" },
  linkBtn: { marginTop: 14, alignSelf: "flex-start" },
  linkText: { color: THEME.MUTED, textDecorationLine: "underline" },
});
