import type { NextApiRequest, NextApiResponse } from "next";

/** Keep in sync with /api/games-v2 */
type League = "nfl" | "nba" | "mlb" | "nhl" | "ncaaf" | "ncaab" | "wnba";
type Game = {
  id: string;
  league: League;
  kickoffISO: string;
  home: string;
  away: string;
  odds: {
    moneyline?: { home?: number; away?: number; book?: string };
    spread?: {
      home?: { point: number; price: number };
      away?: { point: number; price: number };
      book?: string;
    };
    total?: {
      over?: { point: number; price: number };
      under?: { point: number; price: number };
      book?: string;
    };
  };
  predictions?: {
    moneyline?: { pick: "HOME" | "AWAY"; confidencePct: number };
    spread?: { pick: "HOME" | "AWAY"; line: number; confidencePct: number };
    total?: { pick: "OVER" | "UNDER"; line: number; confidencePct: number };
  };
};

function pickMoneyline(m?: Game["odds"]["moneyline"]) {
  if (!m?.home && !m?.away) return undefined;
  const pick: "HOME" | "AWAY" = (m!.home ?? 0) <= (m!.away ?? 0) ? "HOME" : "AWAY";
  const confidencePct = Math.min(95, Math.max(51, 70 + Math.round(Math.random()*20 - 10)));
  return { pick, confidencePct };
}
function pickSpread(s?: Game["odds"]["spread"]) {
  if (!s?.home?.point && !s?.away?.point) return undefined;
  const pick: "HOME" | "AWAY" = (s!.home?.price ?? 0) <= (s!.away?.price ?? 0) ? "HOME" : "AWAY";
  const line = s!.home?.point ?? s!.away?.point ?? 0;
  const confidencePct = Math.min(95, Math.max(51, 70 + Math.round(Math.random()*20 - 10)));
  return { pick, line, confidencePct };
}
function pickTotal(t?: Game["odds"]["total"]) {
  if (!t?.over?.point && !t?.under?.point) return undefined;
  const pick: "OVER" | "UNDER" = (t!.over?.price ?? 0) <= (t!.under?.price ?? 0) ? "OVER" : "UNDER";
  const line = t!.over?.point ?? t!.under?.point ?? 0;
  const confidencePct = Math.min(95, Math.max(51, 70 + Math.round(Math.random()*20 - 10)));
  return { pick, line, confidencePct };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const league = String(req.query.league || "nfl").toLowerCase();
    const from   = String(req.query.from || "");
    const to     = String(req.query.to   || "");
    const host   = req.headers.host;
    const proto =
      (req.headers["x-forwarded-proto"] as string)?.split(",")[0] ||
      (req.headers.referer?.toString().startsWith("http://") ? "http" : "https") ||
      "https";
    if (!host) return res.status(400).json({ ok:false, error:"Missing host" });

    const base = `${proto}://${host}`;
    const url  = `${base}/api/games-v2?league=${encodeURIComponent(league)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const json = await r.json().catch(() => ({}));
    const data: Game[] = Array.isArray(json?.data) ? json.data : [];

    const withPreds: Game[] = data.map((g) => {
      const moneyline = pickMoneyline(g.odds?.moneyline);
      const spread    = pickSpread(g.odds?.spread);
      const total     = pickTotal(g.odds?.total);
      return {
        ...g,
        predictions: {
          ...(moneyline ? { moneyline } : {}),
          ...(spread ? { spread } : {}),
          ...(total ? { total } : {}),
        },
      };
    });

    return res.status(200).json({ meta: { ...(json?.meta || {}), predictionsAttached: true }, data: withPreds });
  } catch (err:any) {
    return res.status(200).json({ meta: { source:"error", error: err?.message || "server_error" }, data: [] });
  }
}
