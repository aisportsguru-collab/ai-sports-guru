import type { NextApiRequest, NextApiResponse } from "next";
import type { Game } from "./games";

function pickMoneyline(m?: Game["odds"]["moneyline"]) {
  if (!m?.home && !m?.away) return undefined;
  const pick = (m!.home ?? 0) < (m!.away ?? 0) ? "HOME" : "AWAY";
  const confidencePct = Math.min(95, Math.max(51, 70 + Math.round(Math.random()*20 - 10)));
  return { pick, confidencePct };
}
function pickSpread(s?: Game["odds"]["spread"]) {
  if (!s?.line) return undefined;
  const pick = (s!.home ?? 0) < (s!.away ?? 0) ? "HOME" : "AWAY";
  const confidencePct = Math.min(95, Math.max(51, 70 + Math.round(Math.random()*20 - 10)));
  return { pick, line: s!.line, confidencePct };
}
function pickTotal(t?: Game["odds"]["total"]) {
  if (!t?.line) return undefined;
  const pick = (t!.over ?? 0) < (t!.under ?? 0) ? "UNDER" : "OVER";
  const confidencePct = Math.min(95, Math.max(51, 70 + Math.round(Math.random()*20 - 10)));
  return { pick, line: t!.line, confidencePct };
}

async function fetchGamesDirect(base: string, league: string, from: string, to: string) {
  const r = await fetch(`${base}/api/games?league=${encodeURIComponent(league)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { headers: { Accept: "application/json" }});
  if (!r.ok) throw new Error(`upstream /api/games failed (${r.status})`);
  return (await r.json()) as { meta?: any; data?: Game[] };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const league = String(req.query.league || "nfl").toLowerCase();
    const from = String(req.query.from || "");
    const to   = String(req.query.to   || "");
    const host = req.headers.host!;
    const proto =
      (req.headers["x-forwarded-proto"] as string)?.split(",")[0] ||
      (req.headers.referer?.toString().startsWith("http://") ? "http" : "https") ||
      "https";
    const base = `${proto}://${host}`;

    let json: { meta?: any; data?: Game[] };
    try {
      json = await fetchGamesDirect(base, league, from, to);
    } catch {
      // last-ditch (shouldn’t run if /api/games is good)
      json = { meta: { league, from, to, count: 0, source: "fallback" }, data: [] };
    }

    const data = Array.isArray(json.data) ? json.data : [];
    const withPreds: Game[] = data.map((g) => ({
      ...g,
      predictions: {
        ...(pickMoneyline(g.odds?.moneyline) ?? {}),
        ...(pickSpread(g.odds?.spread) ?? {}),
        ...(pickTotal(g.odds?.total) ?? {}),
      } as any,
    }));

    return res.status(200).json({ meta: { ...(json.meta||{}), predictionsAttached: true }, data: withPreds });
  } catch (err:any) {
    return res.status(500).json({ ok:false, error: err?.message || "server_error" });
  }
}
