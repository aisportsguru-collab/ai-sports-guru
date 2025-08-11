export const dynamic = "force-dynamic";
export const revalidate = 0;

import PredictionsPage from "@/components/PredictionsPage";

export default function NHLPage() {
  return <PredictionsPage sportKey="nhl" title="NHL — AI Research Picks" />;
}
