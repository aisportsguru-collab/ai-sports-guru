export const dynamic = "force-dynamic";
export const revalidate = 0;

import PredictionsPage from "@/components/PredictionsPage";

export default function NCAABPage() {
  return <PredictionsPage sportKey="ncaab" title="NCAAB — AI Research Picks" />;
}
