import { z } from "zod";

/** Optional/nullable helpers so baseline rows validate cleanly */
const SpreadPick = z
  .object({
    team: z.enum(["home", "away"]),
    line: z.number(),
    price: z.number().nullable().optional(),
    rationale: z.string().optional(), // <-- no longer required
  })
  .strict();

const OUPick = z
  .object({
    pick: z.enum(["over", "under"]),
    total: z.number(),
    price: z.number().nullable().optional(),
    rationale: z.string().optional(), // <-- no longer required
  })
  .strict();

export const PredictionRow = z
  .object({
    sport: z.string(),
    season: z.number(),
    week: z.number().nullable().optional(), // weekly sports only; others use 0 or null
    game_date: z.string(),

    home_team: z.string(),
    away_team: z.string(),

    predicted_winner: z.enum(["home", "away"]),
    confidence: z.number().min(0).max(1),

    spread_pick: SpreadPick.nullable().optional(),
    ou_pick: OUPick.nullable().optional(),

    // allow null/omitted; baseline sets null or can be filled later by LLM
    offense_favor: z.enum(["home", "away", "even"]).nullable().optional(),
    defense_favor: z.enum(["home", "away", "even"]).nullable().optional(),

    key_players_home: z.array(z.string()).optional().default([]),
    key_players_away: z.array(z.string()).optional().default([]),

    analysis: z.any(),
    source_tag: z.string(),
    created_at: z.string(),

    // result/grading fields are optional; present after grading
    result_moneyline: z.enum(["win", "loss", "push"]).optional(),
    result_spread: z.enum(["win", "loss", "push"]).optional(),
    result_total: z.enum(["win", "loss", "push"]).optional(),
    grade: z.number().optional(),
    settled_at: z.string().optional(),
  })
  .strict();

export const PredictionsArray = z.array(PredictionRow);

export type TPredictionRow = z.infer<typeof PredictionRow>;
