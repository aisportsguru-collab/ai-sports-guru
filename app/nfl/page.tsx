import PredictionsPage from "@/components/PredictionsPage";

export default function NFLPage() {
  return (
    <PredictionsPage
      sport="nfl"
      title="NFL — AI Research Picks"
      defaultSeason={new Date().getFullYear()}
      defaultWeek={1}
      isWeekly
      showControls={false}
    />
  );
}