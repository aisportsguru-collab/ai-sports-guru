import Link from 'next/link';

export const metadata = {
  title: 'AI Sports Guru – AI-Powered Betting Predictions',
  description: 'Unlock smarter sports betting with advanced AI predictions for NFL, NBA, MLB, NHL, NCAAF, NCAAB and WNBA.'
};

export default function HomePage() {
  return (
    <section className="flex flex-col items-center text-center space-y-10 py-16">
      {/* Hero */}
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-4xl font-extrabold text-secondary sm:text-5xl">
          Smarter Sports Betting Starts Here
        </h1>
        <p className="text-gray-600 text-lg">
          AI Sports Guru delivers accurate, real-time predictions and odds so you can make
          better decisions on every bet. Get an edge across all major leagues with our
          proprietary machine learning models.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/nba" className="btn btn-primary">Explore Predictions</Link>
          <Link href="/pricing" className="btn btn-secondary">See Pricing</Link>
        </div>
      </div>
      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold text-secondary">Real‑Time Odds</h3>
          <p className="mt-2 text-gray-600">
            We pull live data from multiple sportsbooks and update constantly so you never miss
            a line move.
          </p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold text-secondary">AI‑Driven Predictions</h3>
          <p className="mt-2 text-gray-600">
            Our machine learning models analyze vast historical datasets to produce moneyline,
            spread and total predictions for every game.
          </p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold text-secondary">Cross‑Sport Coverage</h3>
          <p className="mt-2 text-gray-600">
            Whether you enjoy NBA, NFL, MLB, NHL, NCAAF, NCAAB or WNBA, we’ve got you covered
            with comprehensive insights.
          </p>
        </div>
      </div>
    </section>
  );
}