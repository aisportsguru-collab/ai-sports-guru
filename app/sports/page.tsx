import Link from "next/link";
const leagues = ['nfl','nba','mlb','nhl','ncaaf','ncaab','wnba'];

export default function SportsIndex(){
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">Choose a league</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {leagues.map(l => (
          <Link key={l} href={`/sports/${l}`} className="rounded-xl border border-white/10 p-4 hover:border-brand-gold">
            {l.toUpperCase()}
          </Link>
        ))}
      </div>
    </div>
  );
}
