import { headers } from 'next/headers';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { toTriStatus } from '@/lib/subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

type Json = Record<string, any>;

async function insertEventLog(id: string, type: string, payload: Json) {
  const { data: existing } = await supabaseAdmin
    .from('webhook_events')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (existing) return false;

  await supabaseAdmin.from('webhook_events').insert({
    id,
    type,
    payload,
    success: false,
    message: 'received',
  });

  return true;
}

async function markEventProcessed(id: string, ok: boolean, message: string) {
  await supabaseAdmin
    .from('webhook_events')
    .update({ processed_at: new Date().toISOString(), success: ok, message })
    .eq('id', id);
}

async function setSubscriptionStatusByCustomerId(
  stripeCustomerId: string,
  status: 'active' | 'trialing' | 'none'
) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, subscription_status, stripe_customer_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (!profile) return { updated: false };
  if (profile.subscription_status === status) return { updated: true };

  const { error: upErr } = await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: status })
    .eq('id', profile.id);

  if (upErr) throw upErr;
  return { updated: true };
}

async function setSubscriptionStatusByEmail(
  email: string,
  stripeCustomerId: string | null,
  status: 'active' | 'trialing' | 'none'
) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, subscription_status, stripe_customer_id')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (!profile) return { updated: false };

  const patch: Record<string, any> = { subscription_status: status };
  if (stripeCustomerId && !profile.stripe_customer_id) patch.stripe_customer_id = stripeCustomerId;

  const { error: upErr } = await supabaseAdmin
    .from('profiles')
    .update(patch)
    .eq('id', profile.id);

  if (upErr) throw upErr;
  return { updated: true };
}

async function updateFromStripeSubscription(sub: Stripe.Subscription) {
  const tri = toTriStatus(sub.status);
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  await setSubscriptionStatusByCustomerId(customerId, tri);
}

export async function GET() {
  // simple health check
  return new Response('stripe webhook ok', { status: 200 });
}

export async function POST(req: Request) {
  const sig = headers().get('stripe-signature');
  if (!sig) return new Response('Missing Stripe signature', { status: 400 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });

  const raw = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    // extra logging to server console to help diagnose bad secret or body mismatch
    console.error('[stripe] signature verification failed:', err?.message);
    return new Response(`Webhook Error: ${err?.message ?? 'invalid signature'}`, { status: 400 });
  }

  const eventId = event.id;
  const eventType = event.type;
  await insertEventLog(eventId, eventType, event.data.object as any);

  try {
    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = (session.customer as string) ?? null;
        const email =
          session.customer_details?.email ||
          (typeof session.customer_email === 'string' ? session.customer_email : '') ||
          '';

        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const tri = toTriStatus(sub.status);
          if (customerId) {
            await setSubscriptionStatusByCustomerId(customerId, tri);
          } else if (email) {
            await setSubscriptionStatusByEmail(email, sub.customer as string, tri);
          }
        } else if (customerId) {
          await setSubscriptionStatusByCustomerId(customerId, 'active');
        } else if (email) {
          await setSubscriptionStatusByEmail(email, null, 'active');
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await updateFromStripeSubscription(sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        await setSubscriptionStatusByCustomerId(customerId, 'none');
        break;
      }

      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = inv.customer as string | null;
        const email = inv.customer_email || '';
        if (customerId) await setSubscriptionStatusByCustomerId(customerId, 'active');
        else if (email) await setSubscriptionStatusByEmail(email, null, 'active');
        break;
      }

      // ignore the rest
      default:
        break;
    }

    await markEventProcessed(eventId, true, 'processed');
    return new Response('ok', { status: 200 });
  } catch (err: any) {
    console.error('[stripe] handler error:', err);
    await markEventProcessed(eventId, false, err?.message ?? 'error');
    return new Response('Handler Error', { status: 500 });
  }
}
