import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET = process.env.PREDICT_BACKEND_URL || "http://localhost:3001/api/predict";
const OPENAI_KEY = process.env.OPENAI_API_KEY;

function americanToProb(price?: number | null) {
  if (price == null || price === 0) return null;
  return price > 0 ? 100 / (price + 100) : -price / (-price + 100);
}
function normalizePair(pHome: number, pAway: number) {
  const s = pHome + pAway;
  if (s <= 0) return { home: 0.5, away: 0.5 };
  return { home: pHome / s, away: pAway / s };
}
function clamp(x: number, min = 55, max = 100) { return Math.max(min, Math.min(max, Math.round(x))); }
function probToConf(p?: number | null) {
  if (p == null) return 57;
  const p50to100 = 55 + (Math.max(0.5, Math.min(1, p)) - 0.5) * 90; // 0.5->55, 1.0->100
  return clamp(p50to100);
}

async function tryProxy(bodyText: string) {
  const ctl = AbortSignal.timeout(30000);
  const res = await fetch(TARGET, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: bodyText,
    signal: ctl
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Upstream error ${res.status}`);
  try { return JSON.parse(text); } catch { throw new Error("Predictor returned non JSON body"); }
}

async function openaiAssist(payload: any) {
  if (!OPENAI_KEY) return null;
  const base = {
    game_id: payload.game_id,
    sport: payload.sport,
    home_team: payload.home_team,
    away_team: payload.away_team,
    start_time: payload.start_time,
    odds: payload.odds
  };
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a sports prediction assistant. Output strict JSON with fields: moneyline.pick, moneyline.confidence, spread.pick, spread.line, spread.confidence, total.pick, total.line, total.confidence." },
        { role: "user", content: `Given this game JSON and betting odds return your best pick set in the requested JSON fields only.\n${JSON.stringify(base)}` }
      ]
    })
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  try { return content ? JSON.parse(content) : null; } catch { return null; }
}

function baselineFromOdds(payload: any) {
  const odds = payload?.odds || {};

  // MONEYLINE
  const mlHome = americanToProb(odds?.h2h?.home ?? null);
  const mlAway = americanToProb(odds?.h2h?.away ?? null);
  let moneyline: { pick: string | null; confidence: number };
  if (mlHome != null && mlAway != null) {
    const n = normalizePair(mlHome, mlAway);
    const pickHome = n.home >= n.away;
    moneyline = {
      pick: pickHome ? payload.home_team : payload.away_team,
      confidence: probToConf(pickHome ? n.home : n.away)
    };
  } else {
    moneyline = { pick: payload.home_team || null, confidence: 57 };
  }

  // SPREAD
  const sHomeProb = americanToProb(odds?.spread?.home ?? null);
  const sAwayProb = americanToProb(odds?.spread?.away ?? null);
  const spreadLine = odds?.spread?.line ?? 0;
  let spread: { pick: string | null; line: number; confidence: number };
  if (sHomeProb != null && sAwayProb != null) {
    const pickHome = sHomeProb >= sAwayProb;
    const p = pickHome ? sHomeProb : sAwayProb;
    spread = { pick: pickHome ? payload.home_team : payload.away_team, line: spreadLine ?? 0, confidence: probToConf(p) };
  } else {
    spread = { pick: spreadLine <= 0 ? payload.home_team : payload.away_team, line: spreadLine ?? 0, confidence: 57 };
  }

  // TOTAL
  const overProb  = americanToProb(odds?.total?.over ?? null);
  const underProb = americanToProb(odds?.total?.under ?? null);
  const totalLine = odds?.total?.line ?? 44;
  let total: { pick: "over" | "under"; line: number; confidence: number };
  if (overProb != null && underProb != null) {
    const pickOver = overProb >= underProb;
    const p = pickOver ? overProb : underProb;
    total = { pick: pickOver ? "over" as const : "under" as const, line: totalLine, confidence: probToConf(p) };
  } else {
    total = { pick: "under", line: totalLine, confidence: 57 };
  }

  return { moneyline, spread, total };
}

function clampAll(out: any) {
  if (!out) return out;
  if (out.moneyline) out.moneyline.confidence = clamp(out.moneyline.confidence);
  if (out.spread)    out.spread.confidence    = clamp(out.spread.confidence);
  if (out.total)     out.total.confidence     = clamp(out.total.confidence);
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    try {
      const out = await tryProxy(bodyText);
      return NextResponse.json(clampAll(out), { status: 200 });
    } catch {
      // fall through to local baseline+AI
    }

    const payload = JSON.parse(bodyText || "{}");
    const baseline = baselineFromOdds(payload);
    const ai = await openaiAssist(payload);

    const merged = ai ? {
      moneyline: { pick: ai.moneyline?.pick ?? baseline.moneyline.pick, confidence: clamp(ai.moneyline?.confidence ?? baseline.moneyline.confidence) },
      spread:    { pick: ai.spread?.pick    ?? baseline.spread.pick,    line: ai.spread?.line ?? baseline.spread.line, confidence: clamp(ai.spread?.confidence ?? baseline.spread.confidence) },
      total:     { pick: ai.total?.pick     ?? baseline.total.pick,     line: ai.total?.line  ?? baseline.total.line,  confidence: clamp(ai.total?.confidence  ?? baseline.total.confidence) }
    } : baseline;

    return NextResponse.json(merged, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Predict proxy failed" }, { status: 502 });
  }
}
