# AI Sports Guru – Agent Brief
Goal: Production-ready Next.js web app with Stripe subscriptions + Supabase auth, and an Expo RN mobile app consuming the same API. Tasks left:
- Verify all pages build & run (web).
- Wire pricing page to a valid Stripe Price ID env var (NEXT_PUBLIC_STRIPE_PRICE_ID).
- Add basic E2E checks (playwright) for sign-in, subscribe, access gated pages.
- Generate Expo app in /mobile, auth with Supabase (deep links), and render predictions list per sport via /api/predictions/:sport.
- Prepare iOS/Android build configs (icons, app.json/app.config, bundle IDs).
- CI: GitHub Actions for web build + Expo EAS submit stubs.
