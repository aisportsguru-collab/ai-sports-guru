import PredictionsPage from "@/components/PredictionsPage";

const currentYear = new Date().getFullYear();

export default function WNBAPage() {
  return (
    <PredictionsPage
      sport="wnba"
      title="WNBA — AI Research Picks"
      defaultSeason={currentYear}
      showControls={false}
    />
  );
}
