import type { NextApiRequest, NextApiResponse } from "next";
import { getFades } from "@/lib/fades/buildFades";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const league = String(req.query.league || "nfl").toLowerCase();
    const days = Number(req.query.days || 7);
    const rows = await getFades(league, days);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=300");
    return res.status(200).json(rows);
  } catch (err: any) {
    console.error("fades api error", err);
    return res.status(500).json({ error: err?.message || "server_error" });
  }
}
