import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const STRIPE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "price_YOUR_PRO_PRICE_ID";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  try {
    const { userId, email, trialDays = 7 } = await req.json();

    if (!email || !userId) {
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
    }
    if (!STRIPE_PRICE_ID || STRIPE_PRICE_ID.startsWith("price_YOUR_")) {
      return NextResponse.json({ error: "Missing/placeholder STRIPE_PRICE_ID" }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: Number(trialDays) || 7,
        metadata: { user_id: userId },
      },
      metadata: { user_id: userId },
      success_url: `${APP_URL}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/pricing`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
