import PredictionsPage from "@/components/PredictionsPage";

const currentYear = new Date().getFullYear();

export default function NCAAFPage() {
  return (
    <PredictionsPage
      sport="ncaaf"
      title="NCAAF — AI Research Picks"
      defaultSeason={currentYear}
      defaultWeek={1}
      isWeekly
      showControls={false}
    />
  );
}
