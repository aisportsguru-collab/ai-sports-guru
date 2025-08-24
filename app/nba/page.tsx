import { fetchLeaguePredictions } from "@/lib/fetchPredictions";
import PredictionCard from "@/components/PredictionCard";

export const dynamic = "force-dynamic";

export default async function NBAPage() {
  const { count, rows } = await fetchLeaguePredictions("nba");
  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-bold">NBA Predictions</h1>
            <p className="text-[#A6A6A6] mt-1">AI picks with market context — moneyline, spread, and total.</p>
          </div>
          <div className="text-[#F5C847] text-sm font-medium">Games: {count}</div>
        </header>
        <main className="grid grid-cols-1 gap-6">
          {rows.length === 0 && (
            <div className="rounded-2xl border border-[#232632] bg-[#121317] p-6 text-[#A6A6A6]">
              No NBA games found for today. Check back later.
            </div>
          )}
          {rows.map((row: any) => (
            <PredictionCard key={row.external_id ?? row.game_id} row={row} />
          ))}
        </main>
      </div>
    </div>
  );
}
