import type { Db } from '../../db/prisma.ts';
import type { AiTask, Effort } from './types.ts';

/** Models the admin can choose for a task. */
export const ALLOWED_MODELS = [
  'claude-opus-5-5',
  'claude-sonnet-5-5',
  'claude-haiku-5-5',
  'claude-fable-5-1',
] as const;

export interface Route {
  model: string;
  effort: Effort;
  maxTokens: number;
}

/**
 * Defaults: Claude Opus 5.5 everywhere during the pilot (quality first, small volume).
 * Thinking is always on for this model; effort sets how hard it works. Lesson writing is
 * quality-sensitive, so it runs at "high". Super admins can change any route.
 */
export const DEFAULT_ROUTES: Record<AiTask, Route> = {
  LESSON_PLAN: { model: 'claude-opus-5-5', effort: 'high', maxTokens: 32_000 },
  LESSON_DRAFT: { model: 'claude-opus-5-5', effort: 'high', maxTokens: 64_000 },
  LESSON_EVALUATION: { model: 'claude-opus-5-5', effort: 'high', maxTokens: 32_000 },
  SECTION_REWRITE: { model: 'claude-opus-5-5', effort: 'high', maxTokens: 32_000 },
};

/** USD per million tokens (Anthropic list prices, checked 2026-11-05). Cache writes are 1.25× input. */
export const DEFAULT_PRICING: Record<
  string,
  { input: number; output: number; cacheRead: number; cacheWrite: number }
> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  'claude-fable-5-1': { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
  'claude-opus-4-8': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  simulated: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
};

/** Inserts missing routes and prices. Never overwrites an admin's choice. */
export async function bootstrapAiConfig(db: Db) {
  let routes = 0;
  let prices = 0;
  for (const [task, r] of Object.entries(DEFAULT_ROUTES)) {
    const existing = await db.aiModelRoute.findUnique({ where: { task } });
    if (!existing) {
      await db.aiModelRoute.create({ data: { task, ...r } });
      routes++;
    }
  }
  for (const [model, p] of Object.entries(DEFAULT_PRICING)) {
    const existing = await db.aiModelPricing.findUnique({ where: { model } });
    if (!existing) {
      await db.aiModelPricing.create({
        data: {
          model,
          inputPerMTok: p.input,
          outputPerMTok: p.output,
          cacheReadPerMTok: p.cacheRead,
          cacheWritePerMTok: p.cacheWrite,
        },
      });
      prices++;
    }
  }
  return { aiRoutes: routes, aiPrices: prices };
}
