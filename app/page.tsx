"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-black text-white min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="text-center py-20 px-6 bg-gradient-to-b from-black to-gray-900">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
          The Most Accurate AI Sports Betting Predictions
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-6 text-gray-300">
          Trusted by serious bettors. AI-powered predictions for moneyline, spread, and totals—updated daily.
        </p>

        {/* Primary CTA + quick Sign Up link */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/pricing">
            <button className="bg-yellow-400 text-black font-bold px-8 py-4 rounded-2xl hover:bg-yellow-500 transition">
              Start Free Trial
            </button>
          </Link>

          <Link
            href="/sign-up"
            className="text-yellow-400 underline underline-offset-4 hover:text-yellow-300"
          >
            Or create an account first
          </Link>
        </div>
      </section>

      {/* Product Overview */}
      <section className="py-16 px-6 bg-gray-900 text-center">
        <h2 className="text-3xl font-bold mb-10">What You Get</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto text-left">
          {[
            {
              title: "AI-Powered Predictions",
              desc:
                "Get daily predictions for every major sport, generated using real stats, matchups, trends, and betting lines.",
            },
            {
              title: "Confidence Ratings",
              desc:
                "Each pick includes a confidence percentage so you know which bets carry the most value.",
            },
            {
              title: "Simple. Fast. Smart.",
              desc:
                "No analysis needed. Log in, view odds & AI picks, and make informed decisions. Whether you're casual or sharp, it's plug-and-play.",
            },
          ].map((item, i) => (
            <div key={i} className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-gray-300">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why It Works */}
      <section className="py-16 px-6 bg-black text-center">
        <h2 className="text-3xl font-bold mb-6">Why It Works</h2>
        <p className="text-lg max-w-3xl mx-auto text-gray-300 mb-10">
          AI Sports Guru analyzes team and player stats, injury reports, betting trends, and matchup data—then
          generates optimized predictions for each game.
        </p>
        <p className="italic text-sm text-gray-500">
          *Predictions are for entertainment purposes only and do not guarantee outcomes.
        </p>
      </section>

      {/* Pricing CTA */}
      <section className="py-16 px-6 bg-yellow-400 text-black text-center">
        <h2 className="text-3xl font-bold mb-4">Try It Free for 7 Days</h2>
        <p className="text-lg mb-6">Then just $49.99/month. Cancel anytime.</p>
        <Link href="/pricing">
          <button className="bg-black text-yellow-400 font-bold px-8 py-4 rounded-2xl hover:bg-gray-800 transition">
            Start Your Free Trial
          </button>
        </Link>
      </section>

      {/* Testimonials (Optional) */}
      <section className="py-16 px-6 bg-gray-900 text-center">
        <h2 className="text-3xl font-bold mb-8">What Users Are Saying</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto text-left text-sm">
          {[
            {
              quote:
                "My ROI has doubled since I started using AI Sports Guru. It’s become part of my daily routine.",
              name: "Matt R., Arizona",
            },
            {
              quote:
                "This is the most accurate model I’ve used. The confidence scores really help filter noise.",
              name: "Kenny B., Ohio",
            },
            {
              quote:
                "I stopped overthinking and just followed the system. Best decision I’ve made for my bankroll.",
              name: "Sarah L., Nevada",
            },
          ].map((t, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 p-6 rounded-2xl">
              <p className="mb-4 text-gray-200">“{t.quote}”</p>
              <p className="text-gray-400 font-semibold">{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* App Download Tease */}
      <section className="py-16 px-6 bg-black text-center">
        <h2 className="text-3xl font-bold mb-4">Mobile App Coming Soon</h2>
        <p className="text-gray-300 mb-6">
          iOS and Android apps will be available shortly. Use the web app now to get full access.
        </p>
        <div className="flex justify-center gap-6">
          <div className="bg-gray-800 px-6 py-3 rounded-2xl text-gray-500">App Store</div>
          <div className="bg-gray-800 px-6 py-3 rounded-2xl text-gray-500">Google Play</div>
        </div>
      </section>
    </main>
  );
}
