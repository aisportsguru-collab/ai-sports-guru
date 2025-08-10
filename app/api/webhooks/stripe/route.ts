import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Use SDK default API version (do NOT hard-code apiVersion)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Supabase admin client (server-only)
// Never expose this key to the client. This file runs on the server.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  // Read raw body for Stripe signature verification
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err?.message || err);
    return new NextResponse('Signature verification failed', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;
        const email =
          session.customer_details?.email || (session.customer_email as string | undefined);

        // Retrieve subscription to get authoritative status
        let subStatus: string | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          subStatus = sub.status; // e.g., 'trialing' | 'active' | ...
        }

        // Update profiles by email first, else by stripe_customer_id
        if (email) {
          await supabase
            .from('profiles')
            .update({
              is_subscribed: subStatus === 'active' || subStatus === 'trialing',
              subscription_status: subStatus,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .eq('email', email);
        } else if (customerId) {
          await supabase
            .from('profiles')
            .update({
              is_subscribed: subStatus === 'active' || subStatus === 'trialing',
              subscription_status: subStatus,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .eq('stripe_customer_id', customerId);
        }

        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subStatus = subscription.status; // 'active' | 'trialing' | 'canceled' | etc.
        const subscriptionId = subscription.id;

        await supabase
          .from('profiles')
          .update({
            is_subscribed: subStatus === 'active' || subStatus === 'trialing',
            subscription_status: subStatus,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('stripe_customer_id', customerId);

        break;
      }

      default:
        // For other events we don't need to do anything
        break;
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err: any) {
    console.error('❌ Webhook processing error:', err?.message || err);
    return new NextResponse('Webhook handler failed', { status: 500 });
  }
}

// Ensure Node runtime (not Edge) so we can access raw body and use Stripe SDK
export const runtime = 'nodejs';
