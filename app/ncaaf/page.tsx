export const dynamic = "force-dynamic";
export const revalidate = 0;

import PredictionsPage from "@/components/PredictionsPage";

export default function NCAAFPage() {
  return <PredictionsPage sportKey="ncaaf" title="NCAAF — AI Research Picks" useWeek />;
}
