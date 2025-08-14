import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function originFromReq(req: NextRequest) {
  const hdr = req.headers.get("origin");
  if (hdr) return hdr;
  const host = req.headers.get("host");
  return host?.startsWith("localhost") ? `http://${host}` : `https://${host}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const plan = (searchParams.get("plan") || "monthly").toLowerCase(); // monthly | annual
    const priceMonthly =
      process.env.STRIPE_PRICE_MONTHLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
    const priceAnnual =
      process.env.STRIPE_PRICE_ANNUAL || process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL;

    const priceId = plan === "annual" ? priceAnnual : priceMonthly;
    if (!priceId) {
      return NextResponse.json({ error: "Missing Stripe price id" }, { status: 400 });
    }

    const selfUrl = `${originFromReq(req)}/api/stripe/start?plan=${encodeURIComponent(plan)}`;

    // Check session via cookies
    const supabase = createRouteHandlerClient({ cookies });
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      // Preserve plan and the intended next URL
      const login = new URL("/login", originFromReq(req));
      login.searchParams.set("mode", "signup");
      login.searchParams.set("plan", plan);
      login.searchParams.set("next", selfUrl);
      return NextResponse.redirect(login, { status: 302 });
    }

    const userId = data.user.id;

    // Pull customer/email
    const { data: profile } = await admin
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    const email = profile?.email ?? data.user.email ?? undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: String(priceId), quantity: 1 }],
      allow_promotion_codes: true,
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id ? undefined : email,
      client_reference_id: userId,
      success_url: `${originFromReq(req)}/account?status=success`,
      cancel_url: `${originFromReq(req)}/pricing?status=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe session missing URL" }, { status: 500 });
    }
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (e: any) {
    console.error("stripe/start error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
