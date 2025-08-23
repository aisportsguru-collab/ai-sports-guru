import React, { useState } from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet, Switch } from "react-native";
import { THEME, shadows } from "../../../src/theme/colors";

function Row({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{left}</Text>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const [push, setPush] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [odds, setOdds] = useState<"american" | "decimal">("american");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.BG }}>
      <View style={styles.root}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Row left="Push notifications" right={<Switch value={push} onValueChange={setPush} />} />
          <View style={styles.divider} />
          <Row left="Haptics" right={<Switch value={haptics} onValueChange={setHaptics} />} />
        </View>

        <Text style={[styles.subtitle, { marginTop: 16 }]}>Odds format</Text>
        <View style={styles.segment}>
          <Pressable onPress={() => setOdds("american")} style={[styles.segmentBtn, odds === "american" && styles.segmentActive]}>
            <Text style={[styles.segmentText, odds === "american" && styles.segmentTextActive]}>American</Text>
          </Pressable>
          <Pressable onPress={() => setOdds("decimal")} style={[styles.segmentBtn, odds === "decimal" && styles.segmentActive]}>
            <Text style={[styles.segmentText, odds === "decimal" && styles.segmentTextActive]}>Decimal</Text>
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { marginTop: 16 }]}>Legal</Text>
        <View style={styles.card}>
          <Pressable style={styles.linkRow} onPress={() => {}}>
            <Text style={styles.link}>Privacy Policy</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.linkRow} onPress={() => {}}>
            <Text style={styles.link}>Terms of Service</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, paddingTop: 24 },
  title: { color: THEME.TEXT, fontSize: 22, fontWeight: "900", marginBottom: 8 },
  subtitle: { color: THEME.MUTED, fontWeight: "700" },

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
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowText: { color: THEME.TEXT, fontSize: 16, fontWeight: "600" },
  divider: { height: 1, backgroundColor: THEME.BORDER, marginHorizontal: 16 },

  segment: {
    flexDirection: "row",
    backgroundColor: THEME.CARD,
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    ...shadows.sm,
  },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  segmentActive: { backgroundColor: "#15161B" },
  segmentText: { color: THEME.MUTED, fontWeight: "700" },
  segmentTextActive: { color: THEME.GOLD },

  linkRow: { paddingHorizontal: 16, paddingVertical: 16 },
  link: { color: THEME.TEXT, fontSize: 16, fontWeight: "600" },
});
