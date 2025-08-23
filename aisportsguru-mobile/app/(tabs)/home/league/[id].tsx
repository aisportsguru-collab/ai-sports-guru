import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { THEME } from "../../../../src/theme/colors";
import LeagueTemplate from "../../../../src/screens/league/LeagueTemplate";

export default function LeagueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <LeagueTemplate leagueId={String(id || "")} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.BG, paddingHorizontal: 16, paddingTop: 12 },
});
