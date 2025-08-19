import type { NextApiRequest, NextApiResponse } from "next";

const LEAGUES = ["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const to = new Date(today); to.setDate(to.getDate() + 45);

    const fromStr = today.toISOString().slice(0,10);
    const toStr   = to.toISOString().slice(0,10);

    const host = req.headers.host!;
    const proto =
      (req.headers["x-forwarded-proto"] as string)?.split(",")[0] ||
      (req.headers.referer?.toString().startsWith("http://") ? "http" : "https") ||
      "https";
    const base = `${proto}://${host}`;

    const results: any[] = [];
    for (const lg of LEAGUES) {
      const url = `${base}/api/games-with-predictions?league=${lg}&from=${fromStr}&to=${toStr}`;
      const r = await fetch(url, { headers: { Accept: "application/json" }});
      const ok = r.ok;
      let meta: any = null, err: any = null;
      try {
        const body = await r.json();
        meta = body?.meta ?? null;
        err  = body?.error ?? null;
      } catch(e:any) {
        err = e?.message || "parse_error";
      }
      results.push({ league: lg, ok, meta, err });
    }

    res.status(200).json({ ok: true, ranAt: new Date().toISOString(), results });
  } catch (e:any) {
    res.status(500).json({ ok:false, error: e?.message || "server_error" });
  }
}
