import React from "react";
import { View, Text, StyleSheet, Linking, Pressable } from "react-native";
import { ENV } from "../../src/config/env";
import LegalNote from "../../src/components/LegalNote";

const Row = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={s.row}>
    <Text style={s.link}>{label}</Text>
  </Pressable>
);

export default function Settings() {
  return (
    <View style={s.wrap}>
      <Text style={s.h1}>Settings</Text>

      {!!ENV.PRIVACY_URL && (
        <Row label="Privacy Policy" onPress={() => Linking.openURL(ENV.PRIVACY_URL)} />
      )}
      {!!ENV.TERMS_URL && (
        <Row label="Terms of Service" onPress={() => Linking.openURL(ENV.TERMS_URL)} />
      )}

      {/* Keep your restore purchases UI where you already handle it */}

      <LegalNote />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16 },
  h1: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#2a2a2a" },
  link: { color: "#3aa7ff", fontSize: 16 },
});
