import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) return NextResponse.json({ isAdmin: false, user: null });

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, is_admin, subscription_status, created_at")
    .eq("id", data.user.id)
    .maybeSingle();

  return NextResponse.json({
    isAdmin: !!profile?.is_admin,
    user: profile || { id: data.user.id, email: data.user.email },
  });
}
