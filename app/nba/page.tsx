export const dynamic = "force-dynamic";
export const revalidate = 0;

import PredictionsPage from "@/components/PredictionsPage";

export default function NBAPage() {
  return <PredictionsPage sportKey="nba" title="NBA — AI Research Picks" />;
}
