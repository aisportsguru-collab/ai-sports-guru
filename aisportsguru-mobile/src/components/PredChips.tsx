import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Prediction = {
  moneyline?: { pick?: "home"|"away"; team?: string; probability?: number };
  spread?:    { pick?: "home"|"away"; team?: string; points?: number; probability?: number };
  total?:     { pick?: "over"|"under"; points?: number; probability?: number };
};

export default function PredChips({
  pred,
  homeName,
  awayName
}: {
  pred: Prediction | undefined;
  homeName: string;
  awayName: string;
}) {
  if (!pred) return null;

  const pct = (p?: number) => (typeof p === "number" ? `${Math.round(p * 100)}%` : "—");

  const ml = pred.moneyline
    ? `ML: ${pred.moneyline.team ?? (pred.moneyline.pick === "home" ? homeName : awayName)} ${pct(pred.moneyline.probability)}`
    : null;

  const sp = pred.spread
    ? `Spread: ${pred.spread.team ?? (pred.spread.pick === "home" ? homeName : awayName)} ${pred.spread.points != null ? (pred.spread.points > 0 ? `+${pred.spread.points}` : `${pred.spread.points}`) : ""} • ${pct(pred.spread.probability)}`
    : null;

  const tt = pred.total
    ? `Total: ${pred.total.pick === "over" ? "Over" : "Under"} ${pred.total.points ?? "—"} • ${pct(pred.total.probability)}`
    : null;

  if (!ml && !sp && !tt) return null;

  return (
    <View style={styles.block}>
      <Text style={styles.title}>AI Predictions</Text>
      <View style={styles.chipsRow}>
        {ml && <View style={[styles.chip, styles.green]}><Text style={styles.chipTxt}>{ml}</Text></View>}
        {sp && <View style={[styles.chip, styles.blue]}><Text style={styles.chipTxt}>{sp}</Text></View>}
        {tt && <View style={[styles.chip, styles.gray]}><Text style={styles.chipTxt}>{tt}</Text></View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  title: { fontWeight: "700", color: "#111827" },
  chipsRow: { flexDirection: "column", gap: 6 }, // stack on small screens
  chip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, alignSelf: "flex-start" },
  chipTxt: { color: "white", fontWeight: "700" },
  green: { backgroundColor: "#15803D" },
  blue:  { backgroundColor: "#2563EB" },
  gray:  { backgroundColor: "#6B7280" }
});
