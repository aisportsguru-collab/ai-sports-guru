import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

export async function POST(req: Request) {
  try {
    const { customerId } = await req.json().catch(() => ({}));
    if (!customerId) {
      return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: any) {
    console.error("❌ Portal error:", err);
    return NextResponse.json(
      { error: "Failed to create portal session", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
