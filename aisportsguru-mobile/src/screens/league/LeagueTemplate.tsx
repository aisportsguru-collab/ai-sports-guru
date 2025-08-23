import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { THEME, shadows } from "../../theme/colors";
import { useQuery } from "@tanstack/react-query";
import { api, Game } from "../../lib/api";

type Props = {
  leagueId?: string;
};

export default function LeagueTemplate({ leagueId }: Props) {
  const lid = (leagueId ?? "league").toLowerCase();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["games", lid],
    queryFn: () => api.gamesByLeague(lid),
  });

  const title = lid.toUpperCase();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{title} Predictions</Text>

      {isLoading && (
        <View style={styles.card}>
          <ActivityIndicator color={THEME.GOLD} />
          <Text style={styles.cardMuted}>Loading latest lines & model picks…</Text>
        </View>
      )}

      {isError && (
        <View style={styles.card}>
          <Text style={styles.cardMuted}>Could not load data. Check connection and try again.</Text>
          <Pressable onPress={() => refetch()} style={styles.btn}>
            <Text style={styles.btnText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardMuted}>No games available. Pull to refresh later.</Text>
        </View>
      )}

      {(data ?? []).map((g: Game) => (
        <View key={g.id} style={styles.game}>
          <View style={styles.row}>
            <Text style={styles.match}>{g.away} @ {g.home}</Text>
            <Text style={styles.start}>{new Date(g.start).toLocaleString()}</Text>
          </View>

          <View style={styles.lines}>
            {g.spread ? <View style={styles.pill}><Text style={styles.pillText}>{g.spread}</Text></View> : null}
            {g.total ? <View style={styles.pill}><Text style={styles.pillText}>{g.total}</Text></View> : null}
            {(g.mlAway || g.mlHome) ? (
              <View style={styles.pill}><Text style={styles.pillText}>ML {g.mlAway ?? ""}/{g.mlHome ?? ""}</Text></View>
            ) : null}
          </View>

          <View style={styles.pickRow}>
            <Text style={styles.pick}>Pick: <Text style={{ color: THEME.GOLD }}>{g.pick ?? "—"}</Text></Text>
            <Text style={styles.edge}>{g.edge ?? ""}</Text>
          </View>

          <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]} onPress={() => {}}>
            <Text style={styles.btnText}>Add to slip</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingTop: 4, paddingBottom: 8 },
  header: { color: THEME.TEXT, fontSize: 24, fontWeight: "800", marginBottom: 4 },

  card: {
    backgroundColor: THEME.CARD, borderColor: THEME.BORDER, borderWidth: 1, borderRadius: 16,
    padding: 16, gap: 10, ...shadows.sm,
  },
  cardMuted: { color: THEME.MUTED, fontSize: 13 },

  game: {
    backgroundColor: THEME.CARD, borderColor: THEME.BORDER, borderWidth: 1, borderRadius: 16,
    padding: 16, gap: 10, ...shadows.sm,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  match: { color: THEME.TEXT, fontWeight: "800" },
  start: { color: THEME.MUTED, fontSize: 12 },

  lines: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { backgroundColor: "#15161B", borderColor: THEME.BORDER, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { color: THEME.GOLD, fontSize: 12, fontWeight: "700" },

  pickRow: { flexDirection: "row", justifyContent: "space-between" },
  pick: { color: THEME.TEXT, fontWeight: "700" },
  edge: { color: THEME.MUTED, fontSize: 12 },

  btn: { alignSelf: "flex-start", backgroundColor: THEME.GOLD, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  btnText: { color: "#171717", fontWeight: "900" },
});
