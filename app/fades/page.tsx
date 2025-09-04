import { headers } from "next/headers";

type FadeItem = {
  game_id: string;
  game_time: string | null;
  league: string | null;
  matchup: string;
  public_pct: number;
  asg_pick: string;
  asg_prob: number;
};

async function getBase() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function FadesPage() {
  const base = await getBase();
  const url = `${base}/api/fades?league=all&publicThreshold=65&minConfidence=0.55&days=14&sort=public`;
  const res = await fetch(url, { cache: "no-store" });
  const { items = [] }: { items: FadeItem[] } = await res.json();

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16">
      <h1 className="mt-10 text-2xl md:text-3xl font-semibold">Fades — Bet Against the Public</h1>
      <p className="text-sm text-zinc-400 mt-1">
        Games where the public’s majority is opposite our AI prediction.
      </p>

      <div className="mt-6 rounded-xl border border-zinc-800/70 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/40">
            <tr className="text-left text-zinc-400">
              <th className="px-4 py-3 w-48">Time</th>
              <th className="px-4 py-3">Matchup</th>
              <th className="px-4 py-3 w-28">Public %</th>
              <th className="px-4 py-3">ASG Pick</th>
              <th className="px-4 py-3 w-24">Conf.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-zinc-400">
                  No fade opportunities found.
                </td>
              </tr>
            ) : (
              items.map((f) => (
                <tr key={f.game_id}>
                  <td className="px-4 py-3">
                    {f.game_time ? new Date(f.game_time).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">{f.matchup}</td>
                  <td className="px-4 py-3">{Math.round(f.public_pct * 100)}%</td>
                  <td className="px-4 py-3">{f.asg_pick}</td>
                  <td className="px-4 py-3">{Math.round(f.asg_prob * 100)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
