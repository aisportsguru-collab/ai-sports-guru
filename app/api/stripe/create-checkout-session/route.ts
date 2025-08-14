import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripeSecret = process.env.STRIPE_SECRET_KEY!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
const supabase = createClient(supabaseUrl, serviceRole);

function originFromReq(req: NextRequest) {
  const hdr = req.headers.get("origin");
  if (hdr) return hdr;
  const host = req.headers.get("host");
  return host?.startsWith("localhost") ? `http://${host}` : `https://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY");

    const { priceId, userId } = await req.json();
    if (!priceId) return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // Try to get customer + email from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    // If no email in profiles, ask auth admin API
    let email = profile?.email ?? null;
    if (!email) {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(userId);
        if (!error) email = data?.user?.email ?? null;
      } catch {}
    }

    const origin = originFromReq(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: String(priceId), quantity: 1 }],
      allow_promotion_codes: true,
      // prefer existing customer for clean subscription history
      customer: profile?.stripe_customer_id || undefined,
      // if no customer yet, pass email so Stripe can attach
      customer_email: profile?.stripe_customer_id ? undefined : (email ?? undefined),
      client_reference_id: userId,
      success_url: `${origin}/account?status=success`,
      cancel_url: `${origin}/pricing?status=cancelled`,
    });

    if (!session?.url) {
      return NextResponse.json({ error: "Stripe session missing URL" }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("create-checkout-session error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
