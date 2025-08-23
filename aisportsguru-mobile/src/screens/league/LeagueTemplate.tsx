import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { THEME, shadows } from "../../theme/colors";
import { usePredictions } from "../../hooks/usePredictions";

type GameRow = {
  id: string;
  away: string;
  home: string;
  start: string;
  spread?: string;
  total?: string;
  mlAway?: string;
  mlHome?: string;
  pick?: string;
  edge?: string;
};

// Normalize various backend shapes into our UI shape
function normalize(payload: any, sport: string): GameRow[] {
  const list = Array.isArray(payload?.games) ? payload.games : Array.isArray(payload) ? payload : [];
  return list.map((g: any, idx: number) => {
    const id = g.id ?? g.gameId ?? `${sport}-${idx}`;
    const away = g.away ?? g.awayTeam ?? g.teams?.away ?? "Away";
    const home = g.home ?? g.homeTeam ?? g.teams?.home ?? "Home";
    const start = g.start ?? g.startTime ?? g.kickoff ?? new Date().toISOString();

    // odds
    const spread =
      g.spread ??
      g.odds?.spread ??
      (g.odds?.spreadHome != null ? `${home} ${g.odds.spreadHome}` : g.odds?.spreadAway != null ? `${away} ${g.odds.spreadAway}` : undefined);

    const total =
      g.total ??
      g.odds?.total ??
      (g.odds?.ou != null ? `O/U ${g.odds.ou}` : g.odds?.totalPoints != null ? `O/U ${g.odds.totalPoints}` : undefined);

    const mlAway = g.mlAway ?? g.odds?.moneyline?.away ?? g.odds?.mlAway;
    const mlHome = g.mlHome ?? g.odds?.moneyline?.home ?? g.odds?.mlHome;

    // model
    const pick = g.pick ?? g.modelPick?.summary ?? g.model?.pick ?? undefined;
    const edge = g.edge ?? g.modelPick?.edge ?? g.model?.edge ?? undefined;

    return { id, away, home, start, spread, total, mlAway, mlHome, pick, edge };
  });
}

export default function LeagueTemplate({ leagueId }: { leagueId?: string }) {
  const sport = (leagueId ?? "league").toLowerCase();
  const { data, isLoading, isError, refetch, isRefetching } = usePredictions(sport);
  const games = normalize(data, sport);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.BG }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl tintColor={THEME.GOLD} refreshing={isRefetching} onRefresh={() => refetch()} />}
    >
      <Text style={styles.header}>{sport.toUpperCase()} Predictions</Text>

      {isLoading && (
        <View style={styles.card}>
          <ActivityIndicator color={THEME.GOLD} />
          <Text style={styles.cardMuted}>Loading latest lines & model picks…</Text>
        </View>
      )}

      {isError && !isLoading && (
        <View style={styles.card}>
          <Text style={styles.cardMuted}>Could not load data from {process.env.EXPO_PUBLIC_API_BASE}.</Text>
          <Pressable onPress={() => refetch()} style={styles.btn}>
            <Text style={styles.btnText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && games.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardMuted}>No games found. Pull to refresh later.</Text>
        </View>
      )}

      {games.map((g) => (
        <View key={g.id} style={styles.game}>
          <View style={styles.row}>
            <Text style={styles.match}>{g.away} @ {g.home}</Text>
            <Text style={styles.start}>{new Date(g.start).toLocaleString()}</Text>
          </View>

          <View style={styles.lines}>
            {g.spread ? <View style={styles.pill}><Text style={styles.pillText}>{g.spread}</Text></View> : null}
            {g.total ? <View style={styles.pill}><Text style={styles.pillText}>{g.total}</Text></View> : null}
            {(g.mlAway || g.mlHome) ? (
              <View style={styles.pill}><Text style={styles.pillText}>ML {g.mlAway ?? "—"}/{g.mlHome ?? "—"}</Text></View>
            ) : null}
          </View>

          <View style={styles.pickRow}>
            <Text style={styles.pick}>Pick: <Text style={{ color: THEME.GOLD }}>{g.pick ?? "—"}</Text></Text>
            {g.edge ? <Text style={styles.edge}>{g.edge}</Text> : null}
          </View>

          <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]} onPress={() => {}}>
            <Text style={styles.btnText}>Add to slip</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 16, paddingTop: 8 },
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
