import type { NextApiRequest, NextApiResponse } from "next";

const LEAGUES = ["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"] as const;

function ymd(d: Date) {
  const m = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m(d.getUTCMonth()+1)}-${m(d.getUTCDate())}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const now = new Date();
    now.setUTCHours(0,0,0,0);
    const to = new Date(now); to.setUTCDate(now.getUTCDate()+45);

    const host = req.headers.host!;
    const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] || "https";
    const base = `${proto}://${host}`;

    const fromStr = ymd(now);
    const toStr   = ymd(to);

    const hits: any[] = [];
    for (const league of LEAGUES) {
      const url = `${base}/api/games?league=${league}&from=${fromStr}&to=${toStr}`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      const j = await r.json().catch(() => ({}));
      hits.push({ league, ok: r.ok, count: j?.meta?.count ?? 0, source: j?.meta?.source ?? "unknown" });

      // Optionally also warm the predictions wrapper:
      const url2 = `${base}/api/games-with-predictions?league=${league}&from=${fromStr}&to=${toStr}`;
      await fetch(url2, { headers: { Accept: "application/json" } }).catch(() => {});
    }

    return res.status(200).json({ ok: true, range: { from: fromStr, to: toStr }, hits });
  } catch (e:any) {
    return res.status(200).json({ ok:false, error: e?.message || "server_error" });
  }
}
