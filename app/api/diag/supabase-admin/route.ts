import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServerAdmin";

export async function GET() {
  try {
    const { data, error, status } = await supabaseAdmin
      .from("games")
      .select("id")
      .limit(1);

    return NextResponse.json({
      ok: !error,
      status,
      rowCount: data?.length || 0,
      error: error?.message || null,
      details: (error as any)?.details || null,
      code: (error as any)?.code || null,
    }, { status: error ? 500 : 200 });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      status: 0,
      error: e?.message || String(e),
    }, { status: 500 });
  }
}
