import * as React from "react";
import { View, Text, FlatList, RefreshControl, StyleSheet } from "react-native";
import GameRow from "../../components/GameRow";
import { listGames } from "../../lib/api";
import type { Game } from "../../lib/api";

const LEAGUE = "ncaaf" as const;

export default function NCAAF() {
  const [games, setGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const from = new Date(); from.setHours(0,0,0,0);
      const to = new Date(from); to.setDate(from.getDate() + 45);
      const data = await listGames(LEAGUE, {
        from: from.toISOString().slice(0,10),
        to: to.toISOString().slice(0,10),
      });
      setGames(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "fetch_failed");
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const Empty = (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No upcoming NCAAF games</Text>
      <Text style={styles.emptySub}>Try widening the date window.</Text>
      {error ? <Text style={styles.err}>Error: {String(error)}</Text> : null}
    </View>
  );

  return (
    <FlatList
      data={games}
      keyExtractor={(g) => g.id}
      renderItem={({ item }) => <GameRow g={item} />}
      contentContainerStyle={styles.cc}
      ListEmptyComponent={!loading ? Empty : null}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
    />
  );
}

const styles = StyleSheet.create({
  cc: { padding: 12, gap: 12 },
  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyTitle: { fontWeight: "700", color: "#111827" },
  emptySub: { color: "#6B7280" },
  err: { color: "#B91C1C", marginTop: 6 },
});
