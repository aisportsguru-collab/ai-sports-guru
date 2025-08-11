import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

export async function POST(req: Request) {
  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
      },
      // After payment, land on our clean success page
      success_url: `${origin}/success`,
      cancel_url: `${origin}/pricing?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Stripe Checkout error:", err);
    return NextResponse.json(
      { error: "Stripe Checkout failed", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
