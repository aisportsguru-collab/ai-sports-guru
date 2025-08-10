import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Use Stripe's default API version from the SDK to avoid TS errors
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aisportsguru.com';
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    if (!priceId) throw new Error('Missing NEXT_PUBLIC_STRIPE_PRICE_ID');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      // Trial handled here since Stripe UI didn’t show it
      subscription_data: { trial_period_days: 7 },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error('❌ Stripe Checkout error:', err);
    return NextResponse.json({ error: 'Stripe Checkout failed' }, { status: 500 });
  }
}
