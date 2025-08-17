import type { NextApiRequest, NextApiResponse } from "next";

type Moneyline = { home?: number; away?: number; book?: string };
type SpreadSide = { point: number; price: number };
type Spread = { home?: SpreadSide; away?: SpreadSide; book?: string };
type TotalSide = { point: number; price: number };
type Total = { over?: TotalSide; under?: TotalSide; book?: string };

type Game = {
  id: string;
  league: "nfl";
  kickoffISO: string;
  home: string;
  away: string;
  odds: { moneyline?: Moneyline; spread?: Spread; total?: Total };
  predictions?: {
    moneyline?: { pick: "HOME" | "AWAY"; confidencePct: number };
    spread?: { pick: "HOME" | "AWAY"; line: number; confidencePct: number };
    total?: { pick: "OVER" | "UNDER"; line: number; confidencePct: number };
  };
};

function americanToProb(odds: number | undefined): number | undefined {
  if (odds == null) return undefined;
  if (odds < 0) return (-odds) / (-odds + 100);
  return 100 / (odds + 100);
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function pickMoneyline(ml?: Moneyline) {
  if (!ml || (ml.home == null && ml.away == null)) return undefined;
  const pHome = americanToProb(ml.home!);
  const pAway = americanToProb(ml.away!);
  if (pHome == null || pAway == null) return undefined;
  const pick: "HOME" | "AWAY" = pHome >= pAway ? "HOME" : "AWAY";
  const p = Math.max(pHome, pAway);
  const confidence = clamp(Math.round(50 + (p - 0.5) * 100), 51, 95);
  return { pick, confidencePct: confidence };
}
function pickSpread(sp?: Spread) {
  if (!sp || (!sp.home && !sp.away)) return undefined;
  const home = sp.home, away = sp.away;
  if (!home || !away) return undefined;
  const absH = Math.abs(home.point), absA = Math.abs(away.point);
  let pick: "HOME" | "AWAY" =
    absH > absA ? "HOME" : absA > absH ? "AWAY" :
    (Math.abs(home.price) >= Math.abs(away.price) ? "HOME" : "AWAY");
  const line = pick === "HOME" ? home.point : away.point;
  const conf = clamp(50 + Math.round(Math.min(40, Math.abs(line) * 6)), 51, 90);
  return { pick, line, confidencePct: conf };
}
function pickTotal(t?: Total) {
  if (!t || (!t.over && !t.under)) return undefined;
  const over = t.over, under = t.under;
  if (!over || !under) return undefined;
  const pOver = americanToProb(over.price);
  const pUnder = americanToProb(under.price);
  const pick: "OVER" | "UNDER" = (pOver ?? 0.5) >= (pUnder ?? 0.5) ? "OVER" : "UNDER";
  const line = pick === "OVER" ? over.point : under.point;
  const delta = pOver != null && pUnder != null ? Math.abs(pOver - pUnder) : 0.05;
  const conf = clamp(50 + Math.round(delta * 100 * 0.8) + 4, 51, 86);
  return { pick, line, confidencePct: conf };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const league = (req.query.league as string) || "nfl";
    const from = (req.query.from as string) || new Date().toISOString().slice(0,10);
    const to = (req.query.to as string) || from;

    const proto =
      (req.headers["x-forwarded-proto"] as string)?.split(",")[0] ||
      (req.headers.referer?.toString().startsWith("http://") ? "http" : "https") ||
      "https";
    const host = req.headers.host;
    if (!host) return res.status(400).json({ ok:false, error:"Missing host" });

    const base = `${proto}://${host}`;
    const gamesUrl = `${base}/api/games?league=${encodeURIComponent(league)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

    const r = await fetch(gamesUrl, { headers: { Accept: "application/json" } });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ ok:false, error:"upstream /api/games failed", detail:text.slice(0,300) });
    }
    const json = await r.json() as { meta?: any; data?: Game[] };
    const data = Array.isArray(json.data) ? json.data : [];

    const withPreds: Game[] = data.map((g) => {
      const moneyline = pickMoneyline(g.odds?.moneyline);
      const spread = pickSpread(g.odds?.spread);
      const total = pickTotal(g.odds?.total);
      return {
        ...g,
        predictions: {
          ...(moneyline ? { moneyline } : {}),
          ...(spread ? { spread } : {}),
          ...(total ? { total } : {}),
        },
      };
    });

    return res.status(200).json({ meta: { ...(json.meta||{}), predictionsAttached:true }, data: withPreds });
  } catch (err:any) {
    return res.status(500).json({ ok:false, error: err?.message || "server_error" });
  }
}
