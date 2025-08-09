import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

export async function POST(req: NextRequest) {
  try {
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const priceId =
      body.priceId ||
      process.env.STRIPE_PRICE_ID ||
      process.env.NEXT_PUBLIC_DEFAULT_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/test-billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/test-billing?canceled=1`,
      customer: body.customer,
      metadata: {
        supabase_user_id: body.supabase_user_id || "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
