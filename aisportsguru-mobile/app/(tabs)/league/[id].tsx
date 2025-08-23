import { Redirect, useLocalSearchParams } from 'expo-router';
export default function LeagueAliasTabs() {
  const { id } = useLocalSearchParams<{id: string}>();
  return <Redirect href={`/(tabs)/home/league/${id}`} />;
}
