import React from "react";
import { SafeAreaView, ScrollView, Text, StyleSheet } from "react-native";
import { THEME } from "../../src/theme/colors";

export default function Terms() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.BG }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.p}>These themed Terms are a placeholder. Replace with your legal copy before release.</Text>
        <Text style={styles.p}>• Predictions are for entertainment purposes only.</Text>
        <Text style={styles.p}>• No guarantee of accuracy; use at your own discretion.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { color: THEME.TEXT, fontSize: 22, fontWeight: "900", marginBottom: 12 },
  p: { color: THEME.MUTED, fontSize: 14, lineHeight: 20, marginBottom: 10 },
});
