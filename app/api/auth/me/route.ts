import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

// Returns the logged-in user (server-side, via cookies). Never throws on client.
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
