import { fetchJson } from "@/lib/fetchJson";

type Props = { league: string };

type Item = {
  game_id: string;
  league: string;
  home_team: string;
  away_team: string;
  moneyline_home: number | null;
  moneyline_away: number | null;
  line_home: number | null;
  line_away: number | null;
  game_time: string | null;
  asg_prob: number | null;
  asg_pick: string | null;
};

export default async function LeaguePage({ league }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const url = `/api/predict/latest?league=${encodeURIComponent(league)}&date=${today}&days=14`;

  const json = await fetchJson(url);
  const items: Item[] = Array.isArray(json?.items) ? json.items : [];

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-1 uppercase">{league} Games & Picks</h1>
      <p className="text-sm text-gray-400 mb-6">Times shown in your local timezone.</p>

      {items.length === 0 ? (
        <div className="text-gray-400">No games match your filter.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900/40">
              <tr className="text-left">
                <th className="py-2 px-4">Kickoff</th>
                <th className="py-2 px-4">Matchup</th>
                <th className="py-2 px-4">Moneyline (A/H)</th>
                <th className="py-2 px-4">Spread (A/H)</th>
                <th className="py-2 px-4">ASG Pick</th>
                <th className="py-2 px-4">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {items.map((g) => (
                <tr key={g.game_id} className="hover:bg-gray-900/30">
                  <td className="py-2 px-4">
                    {g.game_time ? new Date(g.game_time).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 px-4">
                    <div className="font-medium">{g.away_team}</div>
                    <div className="text-gray-500">at {g.home_team}</div>
                  </td>
                  <td className="py-2 px-4">
                    {(g.moneyline_away ?? "—")} / {(g.moneyline_home ?? "—")}
                  </td>
                  <td className="py-2 px-4">
                    {(g.line_away ?? "—")} / {(g.line_home ?? "—")}
                  </td>
                  <td className="py-2 px-4">{g.asg_pick ?? "—"}</td>
                  <td className="py-2 px-4">
                    {g.asg_prob != null ? `${(g.asg_prob * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
