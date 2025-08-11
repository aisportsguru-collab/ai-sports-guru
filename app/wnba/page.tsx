export const dynamic = "force-dynamic";
export const revalidate = 0;

import PredictionsPage from "@/components/PredictionsPage";

export default function WNBAPage() {
  return <PredictionsPage sportKey="wnba" title="WNBA — AI Research Picks" />;
}
