import { Redirect, useLocalSearchParams } from "expo-router";

export default function LeagueAlias() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const safe = typeof id === "string" ? id : "";
  return <Redirect href={`/(tabs)/home/league/${safe}`} />;
}
