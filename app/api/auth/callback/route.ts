import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

// Called by the client listener whenever auth state changes.
// Writes (or clears) the Supabase auth cookie for server routes.
export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { event, session } = await req.json();

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      // Persist the new session cookie server-side
      await supabase.auth.setSession(session);
    }

    if (event === "SIGNED_OUT") {
      await supabase.auth.signOut();
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 400 });
  }
}
