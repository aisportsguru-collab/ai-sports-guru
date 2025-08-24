import type { NextApiRequest, NextApiResponse } from "next";
import { fetchFades } from "@/lib/fades";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const league = String(req.query.league || "all");
  const { dateFrom, dateTo, publicThreshold, minConfidence } = req.query;

  const out = await fetchFades({
    league: league !== "all" ? league : undefined,
    dateFrom: typeof dateFrom === "string" ? dateFrom : undefined,
    dateTo: typeof dateTo === "string" ? dateTo : undefined,
    publicThreshold: publicThreshold ? Number(publicThreshold) : undefined,
    minConfidence: minConfidence ? Number(minConfidence) : undefined,
  });

  // Always 200 so the page can render a helpful note instead of crashing
  res.status(200).json(out);
}
