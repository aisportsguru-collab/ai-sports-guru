Goal: Finish and launch AI Sports Guru — Next.js 15 app with Supabase auth, Stripe subscriptions, and sports prediction pages (NBA, NFL, MLB, NHL, NCAAF, NCAAB, WNBA). Then scaffold mobile apps (Expo/React Native) consuming the same APIs.

Current status:
- Supabase: `profiles` table with `is_subscribed` (RLS enabled) and `stripe_customer_id`.
- Stripe: Webhook working locally. Checkout session stores `supabase_user_id` in metadata. Subscription events toggle `profiles.is_subscribed`.
- Pages: Sport pages under `app/{sport}/page.tsx` using `/api/predictions/{sport}`.
- UI: Minimal Card component in `components/ui/card.tsx`.
- To verify subscription: `/api/check-subscription`.

Agent tasks:
1) Harden API routes and add input validation.
2) Wire real prediction sources or keep mock for now but cache results. Ensure each `/api/predictions/:sport` returns stable shape.
3) Build pricing page with a real Price ID from Stripe; confirm flow end-to-end (sign-in → subscribe → gated pages).
4) Add error states/loading skeletons; improve styles.
5) Prepare deployment (Vercel). Configure env vars: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID, OPENAI_API_KEY, etc.
6) Write a simple mobile app (Expo) that:
   - Signs in with Supabase (magic link or OAuth)
   - Calls `/api/check-subscription`
   - Renders predictions list per sport
   - Deep links to web for checkout or uses Stripe Mobile Checkout if desired
7) Add CI (lint, typecheck) and a basic Playwright smoke test.

Deliverables:
- Production web deploy on Vercel
- iOS/Android apps (Expo) with App Store / Play Store submission guides
- Docs for environment setup and runbook
