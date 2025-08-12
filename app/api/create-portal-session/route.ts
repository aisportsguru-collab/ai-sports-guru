import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json();
    if (!customerId) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
