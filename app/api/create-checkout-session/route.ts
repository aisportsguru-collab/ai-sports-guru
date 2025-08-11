import { NextResponse } from "next/server";
import Stripe from "stripe";

// Stripe SDK needs Node runtime (not Edge)
export const runtime = "nodejs";
// Avoid any caching
export const dynamic = "force-dynamic";

export async function POST(_req: Request) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aisportsguru.com";
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    const secret = process.env.STRIPE_SECRET_KEY;

    if (!secret || !priceId) {
      console.error("Missing STRIPE_SECRET_KEY or NEXT_PUBLIC_STRIPE_PRICE_ID");
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const stripe = new Stripe(secret);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // 7-day trial on the subscription
      subscription_data: { trial_period_days: 7 },
      // Redirects back to pricing for now (no /success page required)
      success_url: `${appUrl}/pricing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=1`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      console.error("Stripe returned no session.url for session:", session.id);
      return NextResponse.json({ error: "No Checkout URL from Stripe" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Stripe Checkout error:", err?.message || err);
    return NextResponse.json(
      { error: "Stripe Checkout failed", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
