import dynamic from "next/dynamic";
const LeagueScreen = dynamic(() => import("@/components/LeagueScreen"), { ssr: true });

export default function Page() {
  return <LeagueScreen league="nfl" title="NFL" />;
}
