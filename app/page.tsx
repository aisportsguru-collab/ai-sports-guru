import Link from "next/link";

export const metadata = {
  title: "AI Sports Guru – AI-Powered Betting Predictions",
  description:
    "Unlock smarter sports betting with advanced AI predictions for NFL, NBA, MLB, NHL, NCAAF, NCAAB, and WNBA. Get real-time odds, confidence ratings, and data-driven insights.",
};

export default function HomePage() {
  return (
    <main className="bg-gray-50 min-h-screen flex flex-col items-center text-center px-4 py-16">
      {/* Hero Section */}
      <section className="space-y-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-secondary">
          Smarter Sports Betting Starts Here
        </h1>
        <p className="text-gray-600 text-lg sm:text-xl">
          AI Sports Guru delivers accurate, real-time predictions and odds so
          you can make better decisions on every bet. Get an edge across all
          major leagues with our proprietary machine learning models.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/sign-up" className="btn btn-primary px-6 py-3 text-lg">
            Start Free Trial
          </Link>
          <Link href="/pricing" className="btn btn-secondary px-6 py-3 text-lg">
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full px-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-secondary mb-2">
            Real‑Time Odds
          </h3>
          <p className="text-gray-600 text-sm">
            We pull live data from multiple sportsbooks and update constantly so
            you never miss a line move.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-secondary mb-2">
            AI‑Driven Predictions
          </h3>
          <p className="text-gray-600 text-sm">
            Our models analyze massive datasets to generate moneyline, spread,
            and total predictions for every matchup.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-secondary mb-2">
            Cross‑Sport Coverage
          </h3>
          <p className="text-gray-600 text-sm">
            NBA, NFL, MLB, NHL, NCAAF, NCAAB, and WNBA — all included. Get full
            access with one subscription.
          </p>
        </div>
      </section>

      <p className="text-gray-400 text-sm mt-10">
        Cancel anytime. No hidden fees. Just accurate predictions.
      </p>
    </main>
  );
}
