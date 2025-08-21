import React from "react";
import { View, FlatList, RefreshControl, StyleSheet, Text } from "react-native";
import GameRow, { LeagueGame } from "../../components/GameRow";
import { useGames } from "../../state/useGames"; // your existing hook

type Props = { league: string };

export default function LeagueTemplate({ league }: Props) {
  const { games, loading, refresh } = useGames(league);

  const keyExtractor = (item: LeagueGame) =>
    String(item.id ?? `${item.league}-${item.away}-${item.home}-${item.kickoffISO ?? ""}`);

  if (!loading && (!games || games.length === 0)) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.empty}>No upcoming {league.toUpperCase()} games{"\n"}Try widening the date window.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={games}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={!!loading} onRefresh={refresh} tintColor="#9EC8FF" />
        }
        renderItem={({ item }) => <GameRow game={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#081523" },
  center: { justifyContent: "center", alignItems: "center" },
  empty: { color: "#9EC8FF", textAlign: "center", opacity: 0.9 },
  listContent: { paddingVertical: 8, paddingBottom: 24 },
});
