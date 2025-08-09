/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

async function safeUpdate(fn: () => Promise<void>, context: string) {
  try {
    await fn();
  } catch (e) {
    console.error(`DB error in ${context}:`, e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headerList = await headers();
    const sig = headerList.get("stripe-signature") || "";
    if (!sig)
      return new NextResponse("Missing stripe-signature header", {
        status: 400,
      });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return new NextResponse(`Webhook signature verification failed. ${msg}`, {
        status: 400,
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id || null;
        const customerId = (session.customer as string) || null;

        console.log("checkout.session.completed", {
          userId,
          customerId,
          sessionId: session.id,
        });

        if (!userId || !customerId) {
          console.warn(
            "Missing userId or customerId on checkout.session.completed",
          );
          break;
        }

        await safeUpdate(async () => {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_subscribed: true, stripe_customer_id: customerId })
            .eq("id", userId);
          if (error) throw new Error(error.message);
        }, `profiles.update (checkout.session.completed)`);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
        const sub = event.data.object as Stripe.Subscription;
        const active = sub.status === "active" || sub.status === "trialing";
        const customerId = sub.customer as string;
        console.log(event.type, { customerId, status: sub.status });

        await safeUpdate(async () => {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_subscribed: active })
            .eq("stripe_customer_id", customerId);
          if (error) throw new Error(error.message);
        }, `profiles.update (${event.type})`);
        break;
      }

      case "customer.subscription.deleted": {
        const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        console.log("customer.subscription.deleted", { customerId });

        await safeUpdate(async () => {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_subscribed: false })
            .eq("stripe_customer_id", customerId);
          if (error) throw new Error(error.message);
        }, "profiles.update (customer.subscription.deleted)");
        break;
      }

      default:
        console.log("Unhandled event", event.type);
        break;
    }

    // Always 200 so Stripe doesn’t retry while we finish hooking DB.
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Webhook handler error", msg);
    // Still 200 to prevent retries while developing
    return new NextResponse(`Webhook handler error. ${msg}`, { status: 200 });
  }
}
