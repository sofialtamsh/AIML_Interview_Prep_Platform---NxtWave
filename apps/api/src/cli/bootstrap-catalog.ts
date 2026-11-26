/**
 * Inserts any missing catalog configuration (roles, brackets, depth levels, skill areas,
 * companies), the pilot curriculum, the reference lessons (for review, never published) and the
 * Hiring Intelligence data kept in the repo (super admins only).
 * Safe to run on every deploy: never overwrites admin edits.
 *
 *   pnpm db:bootstrap
 */
import { createAppContext } from '../bootstrap.ts';
import { bootstrapAiConfig } from '../modules/ai/models.ts';
import { bootstrapCatalog } from '../modules/catalog/catalog.bootstrap.ts';
import { bootstrapExemplarLessons } from '../modules/content/exemplars/bootstrap.ts';
import { bootstrapMlePilot } from '../modules/curriculum/mle-pilot.ts';
import { bootstrapPilotCurriculum } from '../modules/curriculum/pilot-curriculum.ts';
import { bootstrapHiringData } from '../modules/hiring/hiring.bootstrap.ts';

const ctx = createAppContext('bootstrap');
try {
  const created = await bootstrapCatalog(ctx.db);
  console.log('✓ catalog bootstrap complete', created);
  console.log('✓ pilot curriculum bootstrap complete', await bootstrapPilotCurriculum(ctx.db));
  console.log('✓ ML Engineer pilot', await bootstrapMlePilot(ctx));
  console.log('✓ reference lessons (under review)', await bootstrapExemplarLessons(ctx.db));
  console.log('✓ AI model routes and prices', await bootstrapAiConfig(ctx.db));
  console.log('✓ Hiring Intelligence data (super admins)', await bootstrapHiringData(ctx));
} catch (err) {
  console.error('✗ catalog bootstrap failed', err);
  process.exitCode = 1;
} finally {
  await ctx.db.$disconnect();
}
