import FadesClient from "./FadesClient";

export default async function Page() {
  const initial = {
    league: "nfl",
    days: 7,
    minConfidence: "50", // show more by default
    sort: "time",
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Fades — Bet Against the Public</h1>
      <p className="mb-4 mt-2 text-sm text-neutral-400">
        Games where the public’s majority is opposite our AI prediction.
      </p>
      <FadesClient initial={initial} rows={[]} />
    </div>
  );
}
