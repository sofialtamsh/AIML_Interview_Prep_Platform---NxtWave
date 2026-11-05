import { createAppContext } from './bootstrap.ts';
import { env } from './config/env.ts';
import { deliverMail } from './jobs/mail.job.ts';
import { purgeExpiredAuthRecords } from './jobs/maintenance.ts';
import { createBoss, ensureQueues, QUEUES } from './jobs/queues.ts';
import type { MailMessage } from './mail/mailer.ts';
import { BossJobQueue } from './modules/ai/job-queue.ts';
import { runAgentJob } from './modules/content/agents/run-job.ts';

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
await boss.schedule(QUEUES.purgeAuth.name, '17 3 * * *', null, { tz: 'Asia/Kolkata' });

await boss.work<MailMessage>(QUEUES.mail.name, async (jobs) =>
  deliverMail(jobs, ctx.mailer, ctx.log),
);

// AI content agents: up to two jobs of each kind at once. Each job records its own state,
// so a failure is reported to the admin instead of being retried.
for (const q of [QUEUES.aiGenerate, QUEUES.aiEvaluate, QUEUES.aiRewrite]) {
  await boss.work<{ jobId: string }>(q.name, { localConcurrency: 2 }, async (jobs) => {
    for (const job of jobs) await runAgentJob(ctx, job.data.jobId);
  });
}

await boss.work(QUEUES.purgeAuth.name, async () => {
  const result = await purgeExpiredAuthRecords(ctx);
  ctx.log.info(result, 'purged expired auth records');
  return result;
});

ctx.log.info(
  { queues: Object.values(QUEUES).map((q) => q.name), ai: ctx.ai?.name ?? 'off' },
  'worker started',
);

const shutdown = async (signal: string) => {
  ctx.log.info({ signal }, 'worker shutting down');
  await boss.stop({ graceful: true });
  await ctx.db.$disconnect();
  process.exit(0);
};
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
