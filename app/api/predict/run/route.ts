// app/api/predict/run/route.ts
import { NextResponse } from "next/server";
import { runPredict } from "@/lib/predictRunner"; // adjust import if needed

export const dynamic = "force-dynamic"; // ⬅️ ensures API route isn't pruned

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const league = searchParams.get("league") ?? "nfl";
    const days = Number(searchParams.get("days") ?? 14);
    const store = searchParams.get("store") === "1";

    // call your existing runner
    const result = await runPredict({ league, days, store });

    return NextResponse.json({
      ok: true,
      league,
      from: result.from,
      to: result.to,
      stored: result.stored,
      note: "API route is working on Vercel ✅",
    });
  } catch (err: any) {
    console.error("predict/run error:", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
