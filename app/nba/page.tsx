import PredictionsPage from "@/components/PredictionsPage";
export default function NBAPage() {
  return (
    <PredictionsPage
      sport="nba"
      title="NBA — AI Research Picks"
      defaultSeason={new Date().getFullYear()}
      showControls={false}
    />
  );
}
