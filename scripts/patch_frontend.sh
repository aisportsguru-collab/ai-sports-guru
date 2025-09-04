set -euo pipefail

# 1) Remove the conflicting legacy Pages Router API file
if [ -f pages/api/fades.ts ]; then
  mkdir -p _trash
  mv pages/api/fades.ts _trash/pages_api_fades.ts.bak
  echo "Moved pages/api/fades.ts -> _trash/pages_api_fades.ts.bak"
fi

# 2) Ensure fetchJson helper exists
mkdir -p lib
cat > lib/fetchJson.ts <<'TS'
export async function fetchJson(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const text = await res.text().catch(()=>"");
    throw new Error(`fetch ${url} ${res.status} ${text}`);
  }
  return res.json();
}
TS

# 3) League page (uses internal API and renders table)
mkdir -p 'app/(sports)/[league]'
cat > 'app/(sports)/[league]/page.tsx' <<'TSX'
import { fetchJson } from "@/lib/fetchJson";

type Game = {
  game_id: string;
  league: string;
  home_team: string;
  away_team: string;
  moneyline_home: number | null;
  moneyline_away: number | null;
  line_home: number | null;
  line_away: number | null;
  game_time: string | null;
  asg_prob?: number | null;
  asg_pick?: string | null;
};

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const { league } = await params;
  const sp = await searchParams;

  const dateParam = typeof sp.date === "string" ? sp.date : undefined;
  const date = (dateParam ?? new Date().toISOString().slice(0, 10));
  const days = Number(typeof sp.days === "string" ? sp.days : 14);

  const url =
    `/api/predict/latest?league=${encodeURIComponent(league)}` +
    `&date=${encodeURIComponent(date)}&days=${days}`;

  let items: Game[] = [];
  let error: string | undefined;

  try {
    const data: { league: string; items: Game[]; error?: string } = await fetchJson(url);
    items = Array.isArray(data?.items) ? data.items : [];
    const team = typeof sp.team === "string" ? sp.team.trim() : "";
    if (team) {
      const t = team.toLowerCase();
      items = items.filter(
        (g) =>
          g.home_team?.toLowerCase().includes(t) ||
          g.away_team?.toLowerCase().includes(t)
      );
    }
  } catch (e: any) {
    error = e?.message ?? String(e);
  }

  return (
    <main className="container mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold uppercase">{league.toUpperCase()} Games &amp; Picks</h1>
      <p className="text-sm text-gray-500 mb-4">Times shown in your local timezone.</p>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700">
          Error: {error}
        </div>
      ) : items.length === 0 ? (
        <div className="text-gray-400">No games in window.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="py-2 px-3">Kickoff (UTC)</th>
                <th className="py-2 px-3">Matchup</th>
                <th className="py-2 px-3">Moneyline (A/H)</th>
                <th className="py-2 px-3">Spread (A/H)</th>
                <th className="py-2 px-3">ASG Pick</th>
                <th className="py-2 px-3">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr key={g.game_id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">
                    {g.game_time ? new Date(g.game_time).toUTCString() : "—"}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-medium">{g.away_team}</div>
                    <div className="text-gray-500">at {g.home_team}</div>
                  </td>
                  <td className="py-2 px-3">
                    {(g.moneyline_away ?? "—")} / {(g.moneyline_home ?? "—")}
                  </td>
                  <td className="py-2 px-3">
                    {(g.line_away ?? "—")} / {(g.line_home ?? "—")}
                  </td>
                  <td className="py-2 px-3">{g.asg_pick ?? "—"}</td>
                  <td className="py-2 px-3">
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
TSX

# 4) Fades page -> call internal API, no :3001
mkdir -p app/fades
cat > app/fades/page.tsx <<'TSX'
import { fetchJson } from "@/lib/fetchJson";

type FadeItem = {
  game_id: string;
  league: string;
  home_team: string;
  away_team: string;
  public_pct?: number | null; // 0..1 or %
  asg_pick?: string | null;
  asg_prob?: number | null;
  line_home?: number | null;
  line_away?: number | null;
  game_time?: string | null;
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const sp = await searchParams;
  const league = (typeof sp.league === "string" ? sp.league : "all").toLowerCase();
  const publicThreshold = Number(typeof sp.publicThreshold === "string" ? sp.publicThreshold : 65);
  const minConfidence = Number(typeof sp.minConfidence === "string" ? sp.minConfidence : 0.55);
  const sort = typeof sp.sort === "string" ? sp.sort : "public";

  const url =
    `/api/fades?league=${encodeURIComponent(league)}` +
    `&publicThreshold=${publicThreshold}` +
    `&minConfidence=${minConfidence}` +
    `&sort=${encodeURIComponent(sort)}`;

  let items: FadeItem[] = [];
  let error: string | undefined;

  try {
    const data: { items: FadeItem[]; error?: string } = await fetchJson(url);
    items = Array.isArray(data?.items) ? data.items : [];
  } catch (e: any) {
    error = e?.message ?? String(e);
  }

  return (
    <main className="container mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold">Fades — Bet Against the Public</h1>
      <p className="text-sm text-gray-500 mb-4">
        Games where the public majority is opposite our model.
      </p>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700">
          Error: {error}
        </div>
      ) : items.length === 0 ? (
        <div className="text-gray-400">No fade opportunities found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="py-2 px-3">Kickoff (UTC)</th>
                <th className="py-2 px-3">Matchup</th>
                <th className="py-2 px-3">Public %</th>
                <th className="py-2 px-3">ASG Pick</th>
                <th className="py-2 px-3">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr key={g.game_id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">
                    {g.game_time ? new Date(g.game_time).toUTCString() : "—"}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-medium">{g.away_team}</div>
                    <div className="text-gray-500">at {g.home_team}</div>
                  </td>
                  <td className="py-2 px-3">
                    {g.public_pct == null
                      ? "—"
                      : (g.public_pct > 1 ? g.public_pct : g.public_pct * 100).toFixed(0) + "%"}
                  </td>
                  <td className="py-2 px-3">{g.asg_pick ?? "—"}</td>
                  <td className="py-2 px-3">
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
TSX

echo "✅ Patch applied."
