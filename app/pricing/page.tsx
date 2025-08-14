'use client';

import { useState } from 'react';

const MONTHLY_PRICE = 49.99;
const ANNUAL_PRICE = 499.0; // two months free equivalent

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<null | 'monthly' | 'annual'>(null);

  async function startCheckout(priceId: string) {
    try {
      setLoadingPlan(priceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ? 'monthly' : 'annual');
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) {
        const text = await res.text();
        alert(`Checkout error. ${text}`);
        setLoadingPlan(null);
        return;
      }
      const { url } = await res.json();
      window.location.href = url as string;
    } catch (e: any) {
      alert(`Network error. ${e?.message ?? 'Unknown error'}`);
      setLoadingPlan(null);
    }
  }

  const monthlyId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '';
  const annualId = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || '';

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-center">Choose your plan</h1>
      <p className="mt-3 text-center text-sm opacity-80">
        Accurate AI predictions for NFL, NBA, NCAAF, NCAAB, NHL, and MLB. Cancel anytime.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Monthly</h2>
          <p className="mt-2 text-3xl font-bold">${MONTHLY_PRICE.toFixed(2)}</p>
          <p className="text-sm opacity-80">Billed monthly</p>
          <button
            disabled={loadingPlan !== null || !monthlyId}
            onClick={() => startCheckout(monthlyId)}
            className={`mt-6 w-full rounded-xl px-4 py-3 text-white ${loadingPlan ? 'bg-gray-400' : 'bg-black'} disabled:opacity-60`}
          >
            {loadingPlan === 'monthly' ? 'Redirecting…' : 'Start monthly'}
          </button>
        </div>

        <div className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Annual</h2>
          <p className="mt-2 text-3xl font-bold">${ANNUAL_PRICE.toFixed(0)}</p>
          <p className="text-sm opacity-80">Pay once a year. Two months free</p>
          <button
            disabled={loadingPlan !== null || !annualId}
            onClick={() => startCheckout(annualId)}
            className={`mt-6 w-full rounded-xl px-4 py-3 text-white ${loadingPlan ? 'bg-gray-400' : 'bg-black'} disabled:opacity-60`}
          >
            {loadingPlan === 'annual' ? 'Redirecting…' : 'Start annual'}
          </button>
        </div>
      </div>

      <p className="mt-8 text-center text-xs opacity-70">
        By subscribing, you agree to our Terms of Service and Privacy Policy. Predictions are for entertainment and educational use only. No guarantees on outcomes. Please bet responsibly.
      </p>
    </div>
  );
}
