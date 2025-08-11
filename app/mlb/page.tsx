export const dynamic = "force-dynamic";
export const revalidate = 0;

import PredictionsPage from "@/components/PredictionsPage";

export default function MLBPage() {
  return <PredictionsPage sportKey="mlb" title="MLB — AI Research Picks" />;
}
