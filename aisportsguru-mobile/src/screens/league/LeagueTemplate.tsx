import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { THEME, shadows } from "../../theme/colors";

type Props = {
  leagueId: string;
};

export default function LeagueTemplate({ leagueId }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>{leagueId.toUpperCase()} Predictions</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upcoming Games</Text>
        <Text style={styles.cardMuted}>
          Your predictions list renders here using the shared components. Colors updated to the black and gold theme.
        </Text>

        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Moneyline</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Spread</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Total</Text>
          </View>
        </View>

        <Pressable style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
          <Text style={styles.ctaText}>Refresh</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, paddingTop: 4, paddingBottom: 8 },
  header: { color: THEME.TEXT, fontSize: 24, fontWeight: "800" },

  card: {
    backgroundColor: THEME.CARD,
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    ...shadows.sm,
  },
  cardTitle: { color: THEME.TEXT, fontSize: 16, fontWeight: "700" },
  cardMuted: { color: THEME.MUTED, fontSize: 13, lineHeight: 18 },

  chipsRow: { flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 8 },
  chip: {
    backgroundColor: "#15161B",
    borderColor: THEME.BORDER,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: THEME.GOLD, fontSize: 12, fontWeight: "700" },

  cta: {
    alignSelf: "flex-start",
    backgroundColor: THEME.GOLD,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ctaText: { color: "#171717", fontWeight: "800" },
});
