"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type Props = {
  initial: {
    league: string;
    days: number;
    minConfidence: number;
    sort: string;
  };
};

const leagues = ["all", "nfl", "ncaaf", "mlb"];

export default function Filters({ initial }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = useMemo(() => {
    const sp = new URLSearchParams((searchParams&&typeof searchParams.toString==="function")?searchParams.toString():"");
    return {
      league: sp.get("league") ?? initial.league,
      days: Number(sp.get("days") ?? initial.days) || initial.days,
      minConfidence:
        Number(sp.get("minConfidence") ?? initial.minConfidence) ||
        initial.minConfidence,
      sort: sp.get("sort") ?? initial.sort,
      source: sp.get("source") ?? "rlm",
    };
  }, [searchParams, initial]);

  const setParam = (key: string, value: string) => {
    const sp = new URLSearchParams((searchParams&&typeof searchParams.toString==="function")?searchParams.toString():"");
    sp.set(key, value);
    router.push(`/fades?${sp.toString()}`);
  };

  return (
    <div className="card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <label className="text-sm">
          <div className="opacity-70 text-xs mb-1">League</div>
          <select
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
            value={current.league}
            onChange={(e) => setParam("league", e.target.value)}
          >
            {leagues.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="opacity-70 text-xs mb-1">Days</div>
          <select
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
            value={current.days}
            onChange={(e) => setParam("days", e.target.value)}
          >
            {[3, 7, 14, 21].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="opacity-70 text-xs mb-1">Min Confidence</div>
          <input
            type="number"
            min={50}
            max={100}
            step={5}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
            value={current.minConfidence}
            onChange={(e) => setParam("minConfidence", e.target.value)}
          />
        </label>

        <label className="text-sm">
          <div className="opacity-70 text-xs mb-1">Sort</div>
          <select
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
            value={current.sort}
            onChange={(e) => setParam("sort", e.target.value)}
          >
            <option value="movement">Movement</option>
            <option value="time">Time</option>
            <option value="confidence">Confidence</option>
          </select>
        </label>
      </div>
    </div>
  );
}
