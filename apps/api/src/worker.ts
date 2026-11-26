import { createAppContext } from './bootstrap.ts';
import { env } from './config/env.ts';
import { createBoss, ensureQueues } from './jobs/queues.ts';
import { startWorkers } from './jobs/workers.ts';
import { BossJobQueue } from './modules/ai/job-queue.ts';

/**
 * Background worker: long-running and scheduled work runs here, never on the API request path.
 * Phase 4+ adds the AI agent queues (generation, evaluation, research, imports, video).
 */
const boss = createBoss(env, 'worker');
// The worker queues jobs too: a finished lesson draft queues its evaluation.
const ctx = createAppContext('worker', { jobs: new BossJobQueue(boss) });
boss.on('error', (err) => ctx.log.error({ err }, 'pg-boss error'));

await boss.start();
await ensureQueues(boss);
await startWorkers(boss, ctx);

const shutdown = async (signal: string) => {
  ctx.log.info({ signal }, 'worker shutting down');
  await boss.stop({ graceful: true });
  await ctx.db.$disconnect();
  process.exit(0);
};
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
