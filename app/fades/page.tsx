import FadeCard from "@/components/FadeCard";

const LEAGUES = ["all", "nfl", "nba", "mlb", "nhl", "ncaaf", "ncaab", "wnba"] as const;

async function getData(searchParams: { [k: string]: string | string[] | undefined }) {
  const sp = new URLSearchParams();
  const league = typeof searchParams.league === "string" ? searchParams.league : "all";
  if (typeof searchParams.dateFrom === "string") sp.set("dateFrom", searchParams.dateFrom);
  if (typeof searchParams.dateTo === "string") sp.set("dateTo", searchParams.dateTo);
  if (typeof searchParams.publicThreshold === "string") sp.set("publicThreshold", searchParams.publicThreshold);
  if (typeof searchParams.minConfidence === "string") sp.set("minConfidence", searchParams.minConfidence);

  const url = `/api/fades/${league}?${sp.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fades API ${res.status}`);
  return res.json();
}

export default async function FadesPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const league = (typeof searchParams.league === "string" ? searchParams.league : "all") as typeof LEAGUES[number];
  const data = await getData(searchParams);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Fades</h1>
        <p className="mt-1 text-[#A6A6A6]">
          Fade the public: show games where public is heavy on one side, but the model likes the other.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {LEAGUES.map((l) => {
          const href = l === "all" ? "/fades" : `/fades?league=${l}`;
          const active = l === league;
          return (
            <a
              key={l}
              href={href}
              className={`rounded-xl border px-3 py-1.5 text-sm ${
                active ? "border-[#F5C847] bg-[#121317] text-white"
                       : "border-[#232632] bg-[#0B0B0B] text-[#A6A6A6] hover:text-white"
              }`}
            >
              {l.toUpperCase()}
            </a>
          );
        })}
      </div>

      {data.note ? (
        <div className="mb-4 rounded-2xl border border-[#232632] bg-[#121317] p-4 text-[#A6A6A6]">
          {String(data.note)}
        </div>
      ) : null}

      {data.count === 0 ? (
        <div className="rounded-2xl border border-[#232632] bg-[#121317] p-6 text-center text-[#A6A6A6]">
          No fade opportunities found for the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {data.rows.map((row: any, i: number) => (
            <FadeCard key={`${row.sport}-${row.game_date}-${row.home_team}-${row.away_team}-${i}`} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
