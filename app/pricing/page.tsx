export const dynamic = "force-dynamic";

import Link from "next/link";

export const metadata = {
  title: "Pricing – AI Sports Guru",
  description:
    "Choose a plan that fits your betting style. Start for free or upgrade for more powerful insights.",
};

export default function PricingPage() {
  return (
    <section className="py-16">
      <h1 className="text-3xl font-bold text-center text-secondary mb-8">
        Choose Your Plan
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Free Plan */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col">
          <h2 className="text-xl font-semibold text-secondary mb-2">Free</h2>
          <p className="text-4xl font-bold text-secondary mb-4">
            $0<span className="text-base font-normal text-gray-500">/mo</span>
          </p>
          <ul className="space-y-2 text-gray-600 flex-1">
            <li>Limited daily predictions</li>
            <li>Basic stats and odds</li>
            <li>Community access</li>
          </ul>
          <Link href="/sign-up" className="btn btn-primary mt-6">
            Get Started
          </Link>
        </div>
        {/* Pro Plan */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col border-2 border-secondary">
          <h2 className="text-xl font-semibold text-secondary mb-2">Pro</h2>
          <p className="text-4xl font-bold text-secondary mb-4">
            $19<span className="text-base font-normal text-gray-500">/mo</span>
          </p>
          <ul className="space-y-2 text-gray-600 flex-1">
            <li>Unlimited predictions</li>
            <li>Full odds comparison</li>
            <li>Advanced analytics</li>
            <li>Email support</li>
          </ul>
          {/* The subscribe button will eventually trigger a Stripe checkout session. */}
          <button
            className="btn btn-primary mt-6"
            onClick={() => alert("Integrate Stripe checkout here.")}
          >
            Subscribe
          </button>
        </div>
        {/* Pro+ Plan */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col">
          <h2 className="text-xl font-semibold text-secondary mb-2">Pro+</h2>
          <p className="text-4xl font-bold text-secondary mb-4">
            $199<span className="text-base font-normal text-gray-500">/yr</span>
          </p>
          <ul className="space-y-2 text-gray-600 flex-1">
            <li>All Pro features</li>
            <li>Annual savings (2 months free)</li>
            <li>Priority support</li>
            <li>Early access to new sports</li>
          </ul>
          <button
            className="btn btn-primary mt-6"
            onClick={() => alert("Integrate Stripe checkout here.")}
          >
            Subscribe
          </button>
        </div>
      </div>
    </section>
  );
}
