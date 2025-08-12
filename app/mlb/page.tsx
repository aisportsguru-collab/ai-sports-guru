import PredictionsPage from "@/components/PredictionsPage";

const currentYear = new Date().getFullYear();

export default function MLBPage() {
  return (
    <PredictionsPage
      sport="mlb"
      title="MLB — AI Research Picks"
      defaultSeason={currentYear}
      showControls={false}
    />
  );
}
