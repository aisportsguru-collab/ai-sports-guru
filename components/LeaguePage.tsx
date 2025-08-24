import { fetchLeaguePredictions } from "@/lib/fetchPredictions";
import PredictionCard from "@/components/PredictionCard";

export default async function LeaguePage({ league, season }: { league: any; season?: number|string }) {
  const { rows, count } = await fetchLeaguePredictions(league, { season });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          {String(league).toUpperCase()} Predictions
        </h1>
        <p className="text-sm text-[#A6A6A6] mt-1">
          Live model picks (moneyline, spread, total) with confidence. Updated daily.
        </p>
      </header>

      {count === 0 ? (
        <div className="rounded-2xl border border-[#232632] bg-[#121317] p-6 text-center text-[#A6A6A6]">
          No games found. Check back later today.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {rows.map((row, i) => (
            <PredictionCard key={(row.external_id || row.game_id || i) + String(row.commence_time || "")} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
