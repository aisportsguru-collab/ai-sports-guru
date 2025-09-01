// App Router API: /api/predict/run
import { NextResponse } from "next/server";
import { runPredict } from "../../../../lib/predict"; // <- correct relative path

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const league = searchParams.get("league") ?? "nfl";
  const days   = parseInt(searchParams.get("days") ?? "14", 10);
  const store  = searchParams.get("store") === "1";
  const debug  = searchParams.get("debug") === "1";

  try {
    const result = await runPredict({ league, days, store, debug });

    return NextResponse.json({
      ok: true,
      league,
      from: result.from,
      to: result.to,
      stored: result.stored,
      note: result.note,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
