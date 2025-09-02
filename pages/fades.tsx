import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

type FadeRow = {
  game_id: string;
  league: string;
  start_time: string;
  home_team_id: string;
  away_team_id: string;
  public_home: number;
  public_away: number;
  model_home_prob: number;
  model_away_prob: number;
  fade_side: "HOME" | "AWAY";
  edge: number;
};

const leagues = [
  { id: "nfl", label: "NFL" },
  { id: "ncaaf", label: "NCAAF" },
  { id: "mlb", label: "MLB" },
];

export default function FadesPage() {
  const [league, setLeague] = useState<string>("nfl");
  const [days, setDays] = useState<number>(7);
  const [rows, setRows] = useState<FadeRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/fades?league=${league}&days=${days}`);
        const data: FadeRow[] = r.ok ? await r.json() : [];
        if (mounted) setRows(data);
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [league, days]);

  const pretty = (p: number) => (p * 100).toFixed(1) + "%";

  const grouped = useMemo(() => {
    const m: Record<string, FadeRow[]> = {};
    for (const r of rows) {
      const d = new Date(r.start_time);
      const key = d.toLocaleDateString();
      (m[key] ||= []).push(r);
    }
    return m;
  }, [rows]);

  return (
    <>
      <Head>
        <title>Fades | AI Sports Guru</title>
      </Head>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fade the Public</h1>
            <p className="text-sm text-neutral-400">
              Contrarian spots: when public is heavy on one side but our model prefers the other.
            </p>
          </div>

          <div className="flex gap-2">
            <select
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
            >
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2"
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {[3,7,14].map((d)=> <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 text-neutral-400">
            Loading fades…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 text-neutral-400">
            No contrarian opportunities found for the selected range.
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-6">
              <h2 className="mb-2 text-lg font-semibold text-neutral-200">{date}</h2>
              <div className="overflow-hidden rounded-2xl border border-neutral-800">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-neutral-900/60 text-neutral-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Game</th>
                      <th className="px-3 py-2">Start</th>
                      <th className="px-3 py-2">Public (H/A)</th>
                      <th className="px-3 py-2">Model (H/A)</th>
                      <th className="px-3 py-2">Fade</th>
                      <th className="px-3 py-2">Edge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.game_id} className="odd:bg-neutral-900/30">
                        <td className="px-3 py-2 font-medium">
                          {r.away_team_id} @ {r.home_team_id}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {new Date(r.start_time).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {pretty(r.public_home)} / {pretty(r.public_away)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {pretty(r.model_home_prob)} / {pretty(r.model_away_prob)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              r.fade_side === "HOME" ? "bg-emerald-700/40 text-emerald-200" : "bg-sky-700/40 text-sky-200"
                            }`}
                          >
                            Fade {r.fade_side}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.edge.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
