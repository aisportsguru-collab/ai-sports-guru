export const dynamic = "force-dynamic";
export const revalidate = 0;

import PredictionsPage from "@/components/PredictionsPage";

export default function NFLPage() {
  return <PredictionsPage sportKey="nfl" title="NFL — AI Research Picks" useWeek />;
}
