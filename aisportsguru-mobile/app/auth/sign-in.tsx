import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { THEME } from "../../src/theme/colors";
import { router } from "expo-router";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Sign in</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor={THEME.MUTED}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor={THEME.MUTED}
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Pressable onPress={() => router.replace("/(tabs)/home")} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.btnText}>Sign in</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/auth/sign-up")} style={{ marginTop: 14 }}>
          <Text style={styles.link}>Create account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.BG },
  wrap: { flex: 1, padding: 16, paddingTop: 24 },
  title: { color: THEME.TEXT, fontSize: 28, fontWeight: "900", marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { color: THEME.MUTED, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: THEME.CARD,
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: THEME.TEXT,
  },
  btn: { backgroundColor: THEME.GOLD, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  btnText: { color: "#171717", textAlign: "center", fontWeight: "900" },
  link: { color: THEME.MUTED, textDecorationLine: "underline", textAlign: "center" },
});
