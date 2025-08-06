import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

import express from 'express';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = 3001;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18',
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(
  '/api/webhooks/stripe',
  bodyParser.raw({ type: 'application/json' })
);

app.post('/api/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`✅ Webhook received: ${event.type}`);

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('✅ Payment succeeded!');
      break;

    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }

  res.send();
});

app.listen(port, () => {
  console.log(`🚀 Backend server running on port ${port}`);
});
