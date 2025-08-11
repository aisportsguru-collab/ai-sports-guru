"use client";

import SubscribeButton from "@/components/SubscribeButton";

export default function PricingPage() {
  return (
    <main className="bg-black text-white min-h-screen flex flex-col items-center px-6 pt-20 pb-32">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-center">
        Start Your Free Trial
      </h1>
      <p className="text-lg text-gray-300 text-center max-w-2xl mb-10">
        Get full access to AI Sports Guru for 7 days, absolutely free. Cancel anytime.
      </p>

      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-xl text-center">
        <h2 className="text-3xl font-bold mb-4">$49.99 / month</h2>
        <p className="text-gray-300 mb-6">
          Unlimited access to all AI predictions across all sports: NBA, NFL, NHL, MLB, NCAAF, NCAAB, and WNBA.
        </p>

        <ul className="text-left text-gray-300 space-y-3 mb-8">
          <li>✅ Daily Moneyline, Spread, and Over/Under Predictions</li>
          <li>✅ Confidence Scores with Every Pick</li>
          <li>✅ Secure Login & Mobile-Friendly Interface</li>
          <li>✅ One Subscription, All Sports Included</li>
        </ul>

        {/* Direct to Stripe Checkout */}
        <div className="flex justify-center">
          <SubscribeButton />
        </div>

        <p className="text-sm text-gray-500 mt-6 italic">
          Your card won&apos;t be charged until after the trial. Cancel anytime.
        </p>
      </div>
    </main>
  );
}
