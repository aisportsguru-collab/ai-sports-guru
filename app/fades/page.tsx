import "server-only";

type FadeRow = {
  sport: string;
  game_date: string | null;
  commence_time: string | null;
  home_team: string;
  away_team: string;
  moneyline_home?: number | null;
  moneyline_away?: number | null;
  spread_line?: number | null;
  spread_price_home?: number | null;
  spread_price_away?: number | null;
  total_line?: number | null;
  total_over_price?: number | null;
  total_under_price?: number | null;

  predicted_winner?: string | null;
  pick_moneyline?: string | null;
  pick_spread?: string | null;
  pick_total?: string | null;
  conf_moneyline?: number | null;
  conf_spread?: number | null;
  conf_total?: number | null;

  public_side?: "HOME" | "AWAY";
  public_team?: string | null;
  public_strength_pct?: number | null;
};

export const metadata = { title: "Fades | AI Sports Guru" };

// Important for calling pages/api/* safely
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 30;

const BG = "#0B0B0B";
const CARD = "#121317";
const BORDER = "#232632";
const GOLD = "#F5C847";
const TEXT = "#FFFFFF";
const MUTED = "#A6A6A6";

const LEAGUES = ["all","nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"] as const;

function fmtOdds(n?: number | null) {
  if (n == null) return "—";
  return n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`;
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toUTCString().replace(":00 GMT"," GMT");
  } catch { return s; }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col rounded-xl border px-3 py-2"
         style={{ borderColor: BORDER, backgroundColor: BG }}>
      <span className="text-xs" style={{ color: MUTED }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: TEXT }}>{value}</span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: GOLD, color: "#000" }}>
      {children}
    </span>
  );
}

function FadeCard({ row }: { row: FadeRow }) {
  const conflict =
    row.public_team &&
    row.predicted_winner &&
    row.public_team.toLowerCase() !== row.predicted_winner.toLowerCase();

  const confPct = row.conf_moneyline ?? row.conf_spread ?? row.conf_total ?? null;

  return (
    <div className="rounded-2xl border p-4 md:p-5"
         style={{ borderColor: BORDER, backgroundColor: CARD }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider" style={{ color: MUTED }}>
              {row.sport?.toUpperCase() || "—"} • {row.game_date || "—"}
            </span>
            {conflict ? <Badge>Fade Opportunity</Badge> : null}
          </div>
          <h3 className="truncate text-lg font-semibold" style={{ color: TEXT }}>
            {row.away_team} @ {row.home_team}
          </h3>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>
            {fmtDate(row.commence_time)}
          </p>
        </div>

        <div className="hidden md:flex flex-col items-end gap-2">
          {row.predicted_winner ? (
            <div className="text-sm">
              <span style={{ color: MUTED }}>Model: </span>
              <span className="font-medium" style={{ color: TEXT }}>
                {row.predicted_winner}
                {confPct != null ? ` · ${Math.round(confPct)}%` : ""}
              </span>
            </div>
          ) : null}
          {row.public_team ? (
            <div className="text-sm">
              <span style={{ color: MUTED }}>Public: </span>
              <span className="font-medium" style={{ color: TEXT }}>
                {row.public_team}
                {row.public_strength_pct != null ? ` · ${row.public_strength_pct}%` : ""}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
        <Stat label="ML (Home/Away)" value={`${fmtOdds(row.moneyline_home)} / ${fmtOdds(row.moneyline_away)}`} />
        <Stat label="Spread (Line)" value={row.spread_line ?? "—"} />
        <Stat label="Spread (H/A)" value={`${fmtOdds(row.spread_price_home)} / ${fmtOdds(row.spread_price_away)}`} />
        <Stat label="Total (Line)" value={row.total_line ?? "—"} />
        <Stat label="Total (O/U)" value={`${fmtOdds(row.total_over_price)} / ${fmtOdds(row.total_under_price)}`} />
        <Stat label="Model Picks" value={[
          row.pick_moneyline ? `ML:${row.pick_moneyline}` : null,
          row.pick_spread ? `SP:${row.pick_spread}` : null,
          row.pick_total ? `TOT:${row.pick_total}` : null,
        ].filter(Boolean).join(" · ") || "—"} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 md:hidden">
        {row.predicted_winner ? (
          <span className="text-sm" style={{ color: TEXT }}>
            <span style={{ color: MUTED }}>Model:</span>{" "}
            <strong>{row.predicted_winner}</strong>
            {confPct != null ? ` · ${Math.round(confPct)}%` : ""}
          </span>
        ) : null}
        {row.public_team ? (
          <span className="text-sm" style={{ color: TEXT }}>
            <span style={{ color: MUTED }}>Public:</span>{" "}
            <strong>{row.public_team}</strong>
            {row.public_strength_pct != null ? ` · ${row.public_strength_pct}%` : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const league = (searchParams?.league as string) || "all";
  const publicThreshold = Number(searchParams?.publicThreshold ?? 60);
  const minConfidence = Number(searchParams?.minConfidence ?? 55);
  const sort = (searchParams?.sort as string) || "public";

  const query = new URLSearchParams({
    publicThreshold: String(publicThreshold),
    minConfidence: String(minConfidence),
  });

  const apiPath = `/api/fades/${league}?${query.toString()}`;

  let data: { count: number; rows: FadeRow[]; note?: string } = {
    count: 0,
    rows: [],
    note: undefined,
  };

  try {
    const res = await fetch(apiPath, { cache: "no-store" });
    if (!res.ok) {
      data.note = `API error ${res.status}`;
    } else {
      const json = await res.json();
      data = {
        count: Number(json?.count ?? 0),
        rows: Array.isArray(json?.rows) ? json.rows : [],
        note: json?.note,
      };
    }
  } catch (err: any) {
    data.note = `Fetch failed: ${String(err?.message || err)}`;
  }

  const rows = [...(data.rows || [])].sort((a, b) => {
    if (sort === "confidence") {
      const ca = a.conf_moneyline ?? a.conf_spread ?? a.conf_total ?? 0;
      const cb = b.conf_moneyline ?? b.conf_spread ?? b.conf_total ?? 0;
      return cb - ca;
    }
    if (sort === "time") {
      const ta = a.commence_time ? Date.parse(a.commence_time) : 0;
      const tb = b.commence_time ? Date.parse(b.commence_time) : 0;
      return ta - tb;
    }
    const pa = a.public_strength_pct ?? 0;
    const pb = b.public_strength_pct ?? 0;
    return pb - pa;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10" style={{ color: TEXT }}>
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold md:text-3xl" style={{ color: TEXT }}>
          Fades — Bet Against the Public
        </h1>
        <p className="mt-2 text-sm md:text-base" style={{ color: MUTED }}>
          We flag games where the <span style={{ color: GOLD }}>public’s heavy side</span> conflicts with our model pick.
          Filters default to <strong>{publicThreshold}% public</strong> and <strong>{minConfidence}% confidence</strong>.
        </p>
        {data.note ? (
          <p className="mt-2 text-xs" style={{ color: MUTED }}>
            Note: {data.note}
          </p>
        ) : null}
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {LEAGUES.map((l) => {
          const href = `/fades?league=${l}&publicThreshold=${publicThreshold}&minConfidence=${minConfidence}&sort=${sort}`;
          const active = l === league;
          return (
            <a
              key={l}
              href={href}
              className="rounded-xl border px-3 py-1.5 text-sm transition-colors"
              style={{
                borderColor: active ? GOLD : BORDER,
                backgroundColor: active ? CARD : BG,
                color: active ? TEXT : MUTED,
              }}
            >
              {l.toUpperCase()}
            </a>
          );
        })}

        <div className="ml-auto flex items-center gap-2 text-sm">
          <span style={{ color: MUTED }}>Sort:</span>
          {["public","confidence","time"].map((s) => {
            const href = `/fades?league=${league}&publicThreshold=${publicThreshold}&minConfidence=${minConfidence}&sort=${s}`;
            const active = s === sort;
            return (
              <a
                key={s}
                href={href}
                className="rounded-md px-2 py-1 transition-colors"
                style={{
                  backgroundColor: active ? GOLD : "transparent",
                  color: active ? "#000" : MUTED,
                  border: `1px solid ${active ? GOLD : BORDER}`,
                }}
              >
                {s}
              </a>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-center"
             style={{ borderColor: BORDER, backgroundColor: CARD, color: MUTED }}>
          No fade opportunities found for the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {rows.map((row, i) => (
            <FadeCard key={`${row.sport}-${row.game_date}-${row.home_team}-${row.away_team}-${i}`} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
