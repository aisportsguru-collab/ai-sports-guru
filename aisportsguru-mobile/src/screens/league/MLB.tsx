import * as React from "react";
import { View, Text, FlatList, RefreshControl, StyleSheet } from "react-native";
import GameRow from "../../components/GameRow";
import { listGames, type Game } from "../../data/api";

function ymd(d: Date) {
  const z = new Date(d);
  const yyyy = z.getUTCFullYear();
  const mm = String(z.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(z.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NFL() {
  const [games, setGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const window45 = React.useMemo(() => {
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 45);
    return { from: ymd(from), to: ymd(to) };
  }, []);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listGames("nfl", window45);
      setGames(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "fetch_failed");
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [window45]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const Empty = (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No upcoming MLB games</Text>
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
