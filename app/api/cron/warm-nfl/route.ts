import { NextResponse } from "next/server";

export const runtime = "nodejs";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 45);

    const qs = new URLSearchParams({
      league: "nfl",
      from: ymd(from),
      to: ymd(to),
    }).toString();

    const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.aisportsguru.com"}/api/games?${qs}`;
    const res = await fetch(url, { method: "GET" });
    const json = await res.json();

    return NextResponse.json({ ok: true, meta: json?.meta ?? null }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
