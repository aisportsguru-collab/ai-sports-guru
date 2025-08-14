const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_MODEL = "gpt-4o-mini"; // fast, cheap, solid reasoning

export type MarketPick = {
  market: "moneyline" | "spread" | "total";
  pick: string;        // e.g. "NYK -3.5", "Over 214.5", "DAL ML"
  confidence: number;  // 0..100
  rationale: string;
};

export async function getAIPredictionsForGame(input: {
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;  // ISO
  moneyline?: { home?: number; away?: number };
  spread?: { home?: number; away?: number; point?: number };
  total?: { over?: number; under?: number; point?: number };
}): Promise<MarketPick[]> {
  const prompt = [
    "You are AI Sports Guru, making sharp betting recommendations.",
    "Given teams, lines, and odds, output a Moneyline, Spread, and Total pick with a confidence 0 to 100 and one-sentence rationale.",
    "Only consider provided lines and standard handicapping logic. Do not invent data.",
    "",
    `Sport: ${input.sport}`,
    `Matchup: ${input.awayTeam} @ ${input.homeTeam}`,
    `Start: ${input.commenceTime}`,
    `Moneyline (American odds): home=${input.moneyline?.home ?? "N/A"}, away=${input.moneyline?.away ?? "N/A"}`,
    `Spread: point=${input.spread?.point ?? "N/A"}, home=${input.spread?.home ?? "N/A"}, away=${input.spread?.away ?? "N/A"}`,
    `Total: point=${input.total?.point ?? "N/A"}, over=${input.total?.over ?? "N/A"}, under=${input.total?.under ?? "N/A"}`,
    "",
    "Return strict JSON as an array of three objects for markets [moneyline, spread, total] in this shape:",
    `[{"market":"moneyline","pick":"TEAM ML","confidence":87,"rationale":"..."},
      {"market":"spread","pick":"TEAM -3.5","confidence":74,"rationale":"..."},
      {"market":"total","pick":"Over 214.5","confidence":69,"rationale":"..."}]`,
  ].join("\n");

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: "You output concise JSON only, no prose." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "[]";

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // If the model returns extra text, try to salvage the JSON
    const first = content.indexOf("[");
    const last = content.lastIndexOf("]");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(content.slice(first, last + 1));
      } catch {}
    }
    return [];
  }
}
