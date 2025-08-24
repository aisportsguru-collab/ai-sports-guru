type Row = {
  sport: string;
  game_date: string;
  commence_time?: string | null;
  home_team: string;
  away_team: string;
  public_side: 'HOME'|'AWAY'|'OVER'|'UNDER';
  public_percent: number;
  model_side: 'HOME'|'AWAY'|'OVER'|'UNDER';
  model_confidence: number;
  spread_line?: number | null;
  total_line?: number | null;
};

export default function FadeCard({ row }: { row: Row }) {
  const when = row.commence_time ? new Date(row.commence_time).toLocaleString() : row.game_date;
  return (
    <div className="rounded-2xl border border-[#232632] bg-[#121317] p-5">
      <div className="flex items-center justify-between">
        <div className="text-[#F5C847] text-xs tracking-widest">{row.sport?.toUpperCase()} • {when}</div>
        <div className="text-xs text-[#A6A6A6]">Fade the public</div>
      </div>

      <div className="mt-2 text-lg text-white font-semibold">
        {row.away_team} @ {row.home_team}
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="rounded-xl bg-[#0B0B0B] border border-[#232632] p-3">
          <div className="text-[#A6A6A6]">Public</div>
          <div className="mt-1 text-white">
            {row.public_side} • {Math.round(row.public_percent)}%
          </div>
        </div>
        <div className="rounded-xl bg-[#0B0B0B] border border-[#232632] p-3">
          <div className="text-[#A6A6A6]">Model</div>
          <div className="mt-1 text-white">
            {row.model_side} • {Math.round(row.model_confidence)}%
          </div>
        </div>
        <div className="rounded-xl bg-[#0B0B0B] border border-[#232632] p-3">
          <div className="text-[#A6A6A6]">Lines</div>
          <div className="mt-1 text-white">
            {row.spread_line != null ? `Spread ${row.spread_line}` : '—'} • {row.total_line != null ? `Total ${row.total_line}` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
