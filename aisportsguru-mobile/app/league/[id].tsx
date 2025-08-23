import { Redirect, useLocalSearchParams } from 'expo-router';
export default function LeagueAlias() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!id) return <Redirect href="/(tabs)/home" />;
  return <Redirect href={`/(tabs)/home/league/${id}`} />;
}
