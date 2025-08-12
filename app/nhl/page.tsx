import PredictionsPage from "@/components/PredictionsPage";

const currentYear = new Date().getFullYear();

export default function NHLPage() {
  return (
    <PredictionsPage
      sport="nhl"
      title="NHL — AI Research Picks"
      defaultSeason={currentYear}
      showControls={false}
    />
  );
}
