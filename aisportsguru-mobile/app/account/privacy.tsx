import React from "react";
import { SafeAreaView, View, Text, ScrollView, StyleSheet } from "react-native";
import { THEME } from "../../src/theme/colors";

export default function Privacy() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.BG }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.p}>We respect your privacy. This placeholder page is themed and ready for your policy content.</Text>
        <Text style={styles.p}>• Data usage for predictions is aggregated and anonymized.</Text>
        <Text style={styles.p}>• You can request data deletion at any time.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { color: THEME.TEXT, fontSize: 22, fontWeight: "900", marginBottom: 12 },
  p: { color: THEME.MUTED, fontSize: 14, lineHeight: 20, marginBottom: 10 },
});
