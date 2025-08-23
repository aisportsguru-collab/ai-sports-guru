import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { THEME } from "../../src/theme/colors";
import { router } from "expo-router";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Create account</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            placeholder="Jordan Smith"
            placeholderTextColor={THEME.MUTED}
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

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

        <Pressable onPress={() => router.replace("/(tabs)")} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.btnText}>Create account</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={styles.link}>I already have an account</Text>
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
