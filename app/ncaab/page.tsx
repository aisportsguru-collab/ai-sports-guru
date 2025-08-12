import PredictionsPage from "@/components/PredictionsPage";

const currentYear = new Date().getFullYear();

export default function NCAABPage() {
  return (
    <PredictionsPage
      sport="ncaab"
      title="NCAAB — AI Research Picks"
      defaultSeason={currentYear}
      showControls={false}
    />
  );
}
