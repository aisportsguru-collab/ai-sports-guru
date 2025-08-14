import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Hit our own predictions API to fill caches (AI + odds)
const SPORTS = ["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"];
const DAYS = [0,1]; // today + tomorrow

async function hit(url: string) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0 };
  }
}

export async function GET() {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:3000`;

  const results: any[] = [];
  for (const s of SPORTS) {
    for (const d of DAYS) {
      // first, warm odds-only quickly
      const fast = `${base}/api/predictions/${s}?daysFrom=${d}&fast=1&limit=12`;
      results.push({ s, d, fast: await hit(fast) });

      // then, warm AI (cached in DB)
      const full = `${base}/api/predictions/${s}?daysFrom=${d}&fast=0&limit=12`;
      results.push({ s, d, full: await hit(full) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
