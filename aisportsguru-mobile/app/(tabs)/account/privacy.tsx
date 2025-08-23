import React from "react";
import { SafeAreaView, View, Text, ScrollView, StyleSheet } from "react-native";
import { THEME } from "../../../src/theme/colors";

export default function Privacy() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.BG }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.p}>This themed page is ready for your policy content.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { color: THEME.TEXT, fontSize: 22, fontWeight: "900", marginBottom: 12 },
  p: { color: THEME.MUTED, fontSize: 14, lineHeight: 20, marginBottom: 10 },
});
