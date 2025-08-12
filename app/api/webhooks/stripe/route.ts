import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export const config = {
  api: {
    bodyParser: false,
  },
} as const;

async function buffer(readable: ReadableStream<Uint8Array>) {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
    }

    const buf = await buffer(req.body!);
    const sig = req.headers.get("stripe-signature") as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // user_id was set in metadata in create-checkout-session
        const userId = (session.metadata?.user_id || session.subscription && (await stripe.subscriptions.retrieve(String(session.subscription))).metadata?.user_id || "").trim();
        const customerId = String(session.customer || "");
        if (userId) {
          await supabase.from("profiles").update({
            stripe_customer_id: customerId || null,
          }).eq("id", userId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata?.user_id || "").trim();

        // find profile by userId if present, else by customer id
        let eqColumn: "id" | "stripe_customer_id" = "id";
        let eqValue: string | null = userId || null;

        if (!eqValue) {
          const customerId = String(sub.customer || "");
          eqColumn = "stripe_customer_id";
          eqValue = customerId || null;
        }

        if (!eqValue) break;

        const status = sub.status;
        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

        // role logic: active/past_due/trialing → pro; canceled/unpaid/incomplete_expired → free
        const toPro = ["active", "trialing", "past_due"].includes(status);
        await supabase.from("profiles").update({
          stripe_subscription_id: sub.id,
          stripe_subscription_status: status,
          stripe_current_period_end: currentPeriodEnd,
          role: toPro ? "pro" : "free",
        }).eq(eqColumn, eqValue);

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = String(sub.customer || "");
        await supabase.from("profiles").update({
          stripe_subscription_id: null,
          stripe_subscription_status: "canceled",
          role: "free",
        }).eq("stripe_customer_id", customerId);
        break;
      }

      default:
        // ignore other events
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
